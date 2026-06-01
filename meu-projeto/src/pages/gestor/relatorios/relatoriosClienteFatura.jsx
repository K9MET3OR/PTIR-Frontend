import React, { useState, useEffect } from "react";
import {
  obterRelatorioClientesFaturacao,
  obterDetalhesFaturacaoCliente,
  obterDetalheCliente,
  obterDetalheViagem,
} from "../../../services/relatoriosService";
import { useFeedback } from "../../../context/FeedbackContext";
import styles from "./relatoriosClienteFatura.module.css";

export default function RelatoriosClienteFatura() {
  const feedback = useFeedback();

  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const [data, setData] = useState(null);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedDetailType, setSelectedDetailType] = useState(null);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [viewLevel, setViewLevel] = useState("total");

  function validarDatas() {
    if (!startDate || !endDate) {
      return "Seleciona a data de início e a data de fim.";
    }

    if (new Date(startDate) > new Date(endDate)) {
      return "A data de início não pode ser posterior à data de fim.";
    }

    return null;
  }

  const carregarRelatorio = async (mostrarSucesso = false) => {
    const erroDatas = validarDatas();

    if (erroDatas) {
      setError(erroDatas);
      feedback.warning(erroDatas);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resultado = await obterRelatorioClientesFaturacao(startDate, endDate);

      setData(resultado.data);
      setClientInvoices([]);
      setSelectedClient(null);
      setSelectedDetail(null);
      setSelectedDetailType(null);
      setViewLevel("total");

      if (mostrarSucesso) {
        feedback.success("Relatório carregado com sucesso.");
      }
    } catch (err) {
      const message = err.message || "Erro ao carregar relatório de clientes e faturação";
      setError(message);
      feedback.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRelatorio(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatarEuros = (valor) => {
    return `€${Number(valor || 0).toFixed(2)}`;
  };

  const formatarKm = (valor) => {
    return `${Number(valor || 0).toFixed(2)} km`;
  };

  const formatarDataHora = (valor) => {
    if (!valor) return "-";
    return new Date(valor).toLocaleString("pt-PT");
  };

  const totalClientes = () => {
    return data?.clients?.length || 0;
  };

  const carregarDetalhesCliente = async (clientId) => {
    setDetailsLoading(true);
    setError(null);

    try {
      const resultado = await obterDetalhesFaturacaoCliente(
        clientId,
        startDate,
        endDate
      );

      setSelectedClient(clientId);
      setClientInvoices(resultado.invoices || []);
      setViewLevel("detalhes");
    } catch (err) {
      const message = err.message || "Erro ao carregar detalhes do cliente";
      setError(message);
      feedback.error(message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const carregarDetalheObjeto = async (type, id) => {
    setDetailsLoading(true);
    setError(null);

    try {
      let resultado;

      if (type === "client") {
        resultado = await obterDetalheCliente(id);
        setSelectedDetail(resultado.client);
      }

      if (type === "trip") {
        resultado = await obterDetalheViagem(id);
        setSelectedDetail(resultado.trip);
      }

      setSelectedDetailType(type);
      setViewLevel("detalheObjeto");
    } catch (err) {
      const message = err.message || "Erro ao carregar detalhes";
      setError(message);
      feedback.error(message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const renderTotal = () => {
    if (!data?.summary) {
      return (
        <div className={styles.section}>
          <p>Não existem dados de faturação para este período.</p>
        </div>
      );
    }

    return (
      <div className={styles.section}>
        <h2>Resumo Total de Faturação</h2>

        <div className={styles.totalCard}>
          <div
            className={styles.metric}
            onClick={() => setViewLevel("subtotais")}
            style={{ cursor: "pointer" }}
          >
            <span className={styles.label}>Total de Euros Cobrados:</span>
            <span className={styles.value}>
              {formatarEuros(data.summary.total_euros)}
            </span>
          </div>

          <div className={styles.metric}>
            <span className={styles.label}>Número de Faturas:</span>
            <span className={styles.value}>
              {data.summary.total_invoices || 0}
            </span>
          </div>

          <div className={styles.metric}>
            <span className={styles.label}>Número de Clientes:</span>
            <span className={styles.value}>
              {totalClientes()}
            </span>
          </div>
        </div>

        <button
          className={styles.expandBtn}
          onClick={() => setViewLevel("subtotais")}
        >
          Ver Subtotais por Cliente →
        </button>
      </div>
    );
  };

  const renderSubtotais = () => {
    if (!data?.clients || data.clients.length === 0) {
      return (
        <div className={styles.section}>
          <div className={styles.header}>
            <button
              className={styles.backBtn}
              onClick={() => setViewLevel("total")}
            >
              ← Voltar
            </button>

            <h2>Euros por Cliente</h2>
          </div>

          <p>Não existem clientes com faturação neste período.</p>
        </div>
      );
    }

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => setViewLevel("total")}
          >
            ← Voltar
          </button>

          <h2>Euros por Cliente</h2>
        </div>

        <div className={styles.subtotaisGrid}>
          {data.clients.map((client) => (
            <div key={client.client_id} className={styles.subtotalCard}>
              <div className={styles.subtotalHeader}>
                <span
                  onClick={() => carregarDetalheObjeto("client", client.client_id)}
                  style={{ cursor: "pointer" }}
                  title="Ver detalhes do cliente"
                >
                  {client.client_username || `Cliente ${client.client_id}`}
                </span>

                <span className={styles.value}>
                  {formatarEuros(client.total_euros)}
                </span>
              </div>

              <div className={styles.subtotalDetails}>
                <span>Faturas: {client.total_invoices || 0}</span>
                <span>
                  Valor médio por fatura:{" "}
                  {formatarEuros(
                    Number(client.total_euros || 0) /
                      Math.max(Number(client.total_invoices || 0), 1)
                  )}
                </span>
              </div>

              <button
                className={styles.detalhesBtn}
                onClick={() => carregarDetalhesCliente(client.client_id)}
                disabled={detailsLoading}
              >
                Ver viagens/faturas deste cliente →
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDetalhes = () => {
    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => setViewLevel("subtotais")}
          >
            ← Voltar
          </button>

          <h2>Viagens/Faturas do Cliente {selectedClient}</h2>
        </div>

        {detailsLoading && (
          <div className={styles.loading}>Carregando detalhes...</div>
        )}

        {!detailsLoading && clientInvoices.length === 0 && (
          <p>Não existem viagens/faturas para este cliente.</p>
        )}

        {!detailsLoading && clientInvoices.length > 0 && (
          <div className={styles.detalhesList}>
            {clientInvoices.map((invoice) => (
              <div key={invoice.invoice_id} className={styles.detalheCard}>
                <div className={styles.detalhHeader}>
                  <strong
                    onClick={() => carregarDetalheObjeto("trip", invoice.trip_id)}
                    style={{ cursor: "pointer" }}
                    title="Ver detalhes da viagem"
                  >
                    Viagem #{invoice.trip_id}
                  </strong>
                </div>

                <div className={styles.detalhContent}>
                  <span>Preço: {formatarEuros(invoice.price)}</span>
                  <span>Data da fatura: {formatarDataHora(invoice.data)}</span>
                  <span>Início: {formatarDataHora(invoice.trip_start_date)}</span>
                  <span>Fim: {formatarDataHora(invoice.trip_end_date)}</span>
                  <span>Kms: {formatarKm(invoice.n_kms)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDetalheObjeto = () => {
    if (!selectedDetail) {
      return (
        <div className={styles.section}>
          <p>Não foi possível carregar os detalhes.</p>
        </div>
      );
    }

    const titulo =
      selectedDetailType === "client"
        ? `Detalhes do Cliente ${selectedDetail.id}`
        : `Detalhes da Viagem #${selectedDetail.id}`;

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => setViewLevel(clientInvoices.length > 0 ? "detalhes" : "subtotais")}
          >
            ← Voltar
          </button>

          <h2>{titulo}</h2>
        </div>

        <div className={styles.detalhesList}>
          {Object.entries(selectedDetail).map(([key, value]) => (
            <div key={key} className={styles.detalheCard}>
              <div className={styles.detalhContent}>
                <span>
                  <strong>{key}:</strong>{" "}
                  {value === null || value === undefined || value === ""
                    ? "-"
                    : String(value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header_section}>
        <h1>Relatórios - Clientes e Faturação</h1>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label>Data de Início:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Data de Fim:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button
            className={styles.loadBtn}
            onClick={() => carregarRelatorio(true)}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Carregar Relatório"}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading && <div className={styles.loading}>Carregando dados...</div>}

      {!loading && data && viewLevel === "total" && renderTotal()}

      {!loading && data && viewLevel === "subtotais" && renderSubtotais()}

      {!loading && data && viewLevel === "detalhes" && renderDetalhes()}

      {!loading && data && viewLevel === "detalheObjeto" && renderDetalheObjeto()}
    </div>
  );
}