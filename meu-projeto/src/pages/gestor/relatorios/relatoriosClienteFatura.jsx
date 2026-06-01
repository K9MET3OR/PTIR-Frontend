import React, { useState, useEffect } from 'react';
import { obterRelatorioClientesFaturacao } from '../../../services/relatoriosService';
import styles from './relatoriosClienteFatura.module.css';

export default function RelatoriosClienteFatura() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewLevel, setViewLevel] = useState('total');

  const carregarRelatorio = async () => {
    setLoading(true);
    setError(null);

    try {
      const resultado = await obterRelatorioClientesFaturacao(startDate, endDate);

      console.log('Resultado relatório clientes e faturação:', resultado);

      setData(resultado.data);
      setViewLevel('total');
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
      setError(err.message || 'Erro ao carregar relatório de clientes e faturação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRelatorio();
  }, []);

  const formatarEuros = (valor) => {
    return `€${Number(valor || 0).toFixed(2)}`;
  };

  const totalClientes = () => {
    return data?.clients?.length || 0;
  };

  const totalFaturasClientes = () => {
    return data?.clients?.reduce(
      (acc, client) => acc + Number(client.total_invoices || 0),
      0
    ) || 0;
  };

  const totalEurosClientes = () => {
    return data?.clients?.reduce(
      (acc, client) => acc + Number(client.total_euros || 0),
      0
    ) || 0;
  };

  const getTotalEurosResumo = () => {
    return (
      data?.summary?.total_euros ??
      data?.summary?.total_billing ??
      data?.summary?.total_price ??
      totalEurosClientes()
    );
  };

  const getTotalFaturasResumo = () => {
    return (
      data?.summary?.total_invoices ??
      data?.summary?.total_trips ??
      totalFaturasClientes()
    );
  };

  const renderTotal = () => {
    if (!data?.summary && !data?.clients) {
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
          <div className={styles.metric}>
            <span className={styles.label}>Total de Euros Cobrados:</span>
            <span className={styles.value}>
              {formatarEuros(getTotalEurosResumo())}
            </span>
          </div>

          <div className={styles.metric}>
            <span className={styles.label}>Número de Faturas:</span>
            <span className={styles.value}>
              {getTotalFaturasResumo()}
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
          onClick={() => setViewLevel('subtotais')}
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
              onClick={() => setViewLevel('total')}
            >
              ← Voltar
            </button>

            <h2>Euros por Cliente</h2>
          </div>

          <p>Não existem clientes com faturação neste período.</p>
        </div>
      );
    }

    const clientesOrdenados = [...data.clients].sort(
      (a, b) => Number(b.total_euros || 0) - Number(a.total_euros || 0)
    );

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => setViewLevel('total')}
          >
            ← Voltar
          </button>

          <h2>Euros por Cliente</h2>
        </div>

        <div className={styles.subtotaisGrid}>
          {clientesOrdenados.map((client) => (
            <div key={client.client_id} className={styles.subtotalCard}>
              <div className={styles.subtotalHeader}>
                <span>Cliente {client.client_id}</span>

                <span className={styles.value}>
                  {formatarEuros(client.total_euros)}
                </span>
              </div>

              <div className={styles.subtotalDetails}>
                <span>Faturas: {client.total_invoices || 0}</span>
                <span>
                  Valor médio por fatura:{' '}
                  {formatarEuros(
                    Number(client.total_euros || 0) /
                    Math.max(Number(client.total_invoices || 0), 1)
                  )}
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
            onClick={carregarRelatorio}
            disabled={loading}
          >
            {loading ? 'Carregando...' : 'Carregar Relatório'}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading && <div className={styles.loading}>Carregando dados...</div>}

      {data && !loading && viewLevel === 'total' && renderTotal()}

      {data && !loading && viewLevel === 'subtotais' && renderSubtotais()}
    </div>
  );
}