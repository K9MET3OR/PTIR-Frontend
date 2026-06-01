import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { invoiceService } from "../../services/invoiceService";
import { listarViagensFinalizadasMotorista } from "../../services/tripService";
import { useFeedback } from "../../context/FeedbackContext";
import styles from "./FaturaPage.module.css";

function formatarData(data) {
  if (!data) return "—";

  const d = new Date(data);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatarValor(valor) {
  const n = Number(valor);

  if (Number.isNaN(n)) {
    return "—";
  }

  return `${n.toFixed(2)} €`;
}

function obterOrigem(trip) {
  return trip.start_location || trip.morada_inicio || "—";
}

function obterDestino(trip) {
  return trip.end_location || trip.morada_fim || "—";
}

function pluralViagens(total) {
  return total === 1 ? "viagem" : "viagens";
}

function pluralFaturas(total) {
  return total === 1 ? "fatura emitida" : "faturas emitidas";
}

export default function FaturaPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const feedback = useFeedback();

  const [trips, setTrips] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [tripSelecionada, setTripSelecionada] = useState("");

  async function carregarDados() {
    if (!user?.id) {
      const message = "Não foi possível identificar o motorista.";
      setErro(message);
      feedback.error(message);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErro("");
      setSucesso("");

      const [tripsResponse, invoicesResponse] = await Promise.all([
        listarViagensFinalizadasMotorista(user.id),
        invoiceService.listByDriver(user.id),
      ]);

      const todasViagens = tripsResponse?.trips || [];
      const invoicesList = invoicesResponse?.invoices || [];

      const invoicesOrdenadas = [...invoicesList].sort((a, b) => {
        return new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime();
      });

      setInvoices(invoicesOrdenadas);

      const invoiceTripIds = new Set(
        invoicesOrdenadas.map((inv) => String(inv.trip_id))
      );

      const viagensSemFatura = todasViagens
        .filter((trip) => {
          const finished = trip.status_trip === "finished";
          const semFatura = !invoiceTripIds.has(String(trip.id));
          const precoValido = Number(trip.price) > 0;

          return finished && semFatura && precoValido;
        })
        .sort((a, b) => {
          const dataA = new Date(a.end_date || a.start_date || 0).getTime();
          const dataB = new Date(b.end_date || b.start_date || 0).getTime();

          return dataB - dataA;
        });

      setTrips(viagensSemFatura);
    } catch (err) {
      console.error("Erro ao carregar faturas:", err);

      const message = err.message || "Erro ao carregar dados das faturas.";
      setErro(message);
      feedback.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const tripSelecionadaObj = useMemo(
    () => trips.find((t) => String(t.id) === String(tripSelecionada)) || null,
    [trips, tripSelecionada]
  );

  const totalFaturado = useMemo(() => {
    return invoices.reduce((total, inv) => {
      const valor = Number(inv.valor);
      return Number.isNaN(valor) ? total : total + valor;
    }, 0);
  }, [invoices]);

  async function handleEmitir() {
    setErro("");
    setSucesso("");

    if (!tripSelecionada) {
      const message = "Seleciona uma viagem para emitir a fatura.";
      setErro(message);
      feedback.warning(message);
      return;
    }

    setSaving(true);

    try {
      const response = await invoiceService.register({ trip_id: tripSelecionada });
      const novaFatura = response.invoice;

      const message = `Fatura ${novaFatura.numero_formatado} emitida com sucesso.`;

      setSucesso(message);
      setTripSelecionada("");
      feedback.success(message);

      setTrips((current) =>
        current.filter((trip) => String(trip.id) !== String(tripSelecionada))
      );

      setInvoices((current) => {
        const atualizadas = [novaFatura, ...current];

        return atualizadas.sort((a, b) => {
          return new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime();
        });
      });
    } catch (err) {
      console.error("Erro ao emitir fatura:", err);

      const message = err.message || "Erro ao emitir fatura.";
      setErro(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.pageShell}>
        <div className={styles.header}>
          <div>
            <h1>Faturas</h1>
            <p>Emite faturas para viagens pagas e finalizadas, sem preencher dados manualmente.</p>
          </div>

          <button className={styles.backButton} onClick={() => navigate("/motorista/mapa")}>
            ← Voltar ao mapa
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingCard}>
            <div className={styles.loaderDot} />
            <span>A carregar faturas...</span>
          </div>
        ) : (
          <>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Faturas emitidas</span>
                <strong>{invoices.length}</strong>
                <p>{pluralFaturas(invoices.length)}</p>
              </div>

              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Por faturar</span>
                <strong>{trips.length}</strong>
                <p>{pluralViagens(trips.length)} finalizada{trips.length === 1 ? "" : "s"}</p>
              </div>

              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Total faturado</span>
                <strong>{formatarValor(totalFaturado)}</strong>
                <p>Valor total emitido</p>
              </div>
            </div>

            <div className={styles.infoBanner}>
              <div className={styles.infoIcon}>i</div>
              <div>
                <strong>Regra de emissão</strong>
                <p>
                  Só aparecem viagens finalizadas, pagas e sem fatura associada. Após emissão,
                  a fatura entra no topo da lista.
                </p>
              </div>
            </div>

            <div className={styles.grid}>
              <section className={styles.issueCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.cardKicker}>Nova fatura</span>
                    <h2>Emitir fatura</h2>
                  </div>
                  <div className={styles.cardIcon}>🧾</div>
                </div>

                {trips.length === 0 ? (
                  <div className={styles.emptyBox}>
                    <div className={styles.emptyIcon}>✓</div>
                    <strong>Sem viagens pendentes</strong>
                    <p>Não há viagens finalizadas pendentes de faturação.</p>
                  </div>
                ) : (
                  <>
                    <label className={styles.fieldLabel}>
                      Viagem a faturar
                      <select
                        className={styles.select}
                        value={tripSelecionada}
                        onChange={(e) => {
                          setTripSelecionada(e.target.value);
                          setErro("");
                          setSucesso("");
                        }}
                      >
                        <option value="">Escolhe uma viagem finalizada</option>

                        {trips.map((trip) => (
                          <option key={trip.id} value={trip.id}>
                            {formatarData(trip.end_date || trip.start_date)} ·{" "}
                            {obterOrigem(trip)} → {obterDestino(trip)} ·{" "}
                            {formatarValor(trip.price)}
                          </option>
                        ))}
                      </select>
                    </label>

                    {tripSelecionadaObj && (
                      <div className={styles.tripPreview}>
                        <div className={styles.routePreview}>
                          <div>
                            <span>Origem</span>
                            <strong>{obterOrigem(tripSelecionadaObj)}</strong>
                          </div>

                          <div className={styles.routeDivider}>→</div>

                          <div>
                            <span>Destino</span>
                            <strong>{obterDestino(tripSelecionadaObj)}</strong>
                          </div>
                        </div>

                        <div className={styles.tripDetailsGrid}>
                          <div>
                            <span>Início</span>
                            <strong>{formatarData(tripSelecionadaObj.start_date)}</strong>
                          </div>

                          <div>
                            <span>Fim</span>
                            <strong>{formatarData(tripSelecionadaObj.end_date)}</strong>
                          </div>

                          <div>
                            <span>Pessoas</span>
                            <strong>{tripSelecionadaObj.n_people ?? "—"}</strong>
                          </div>

                          <div>
                            <span>Quilómetros</span>
                            <strong>
                              {tripSelecionadaObj.n_kms
                                ? `${Number(tripSelecionadaObj.n_kms).toFixed(2)} km`
                                : "—"}
                            </strong>
                          </div>
                        </div>

                        <div className={styles.amountBox}>
                          <span>Valor a faturar</span>
                          <strong>{formatarValor(tripSelecionadaObj.price)}</strong>
                        </div>
                      </div>
                    )}

                    <button
                      className={styles.submitButton}
                      onClick={handleEmitir}
                      disabled={saving || !tripSelecionada}
                    >
                      {saving ? "A emitir..." : "Emitir fatura"}
                    </button>
                  </>
                )}

                {erro && <div className={styles.erro}>{erro}</div>}
                {sucesso && <div className={styles.sucesso}>{sucesso}</div>}
              </section>

              <section className={styles.invoicePanel}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.cardKicker}>Histórico</span>
                    <h2>Faturas emitidas</h2>
                  </div>
                  <div className={styles.cardIcon}>€</div>
                </div>

                {invoices.length === 0 ? (
                  <div className={styles.emptyBox}>
                    <div className={styles.emptyIcon}>🧾</div>
                    <strong>Ainda sem faturas</strong>
                    <p>Quando emitires a primeira fatura, ela aparecerá aqui.</p>
                  </div>
                ) : (
                  <div className={styles.invoiceList}>
                    {invoices.map((inv) => (
                      <article key={inv.id} className={styles.invoiceItem}>
                        <div className={styles.invoiceTop}>
                          <div>
                            <span className={styles.invoiceLabel}>Fatura</span>
                            <strong className={styles.invoiceNum}>
                              {inv.numero_formatado}
                            </strong>
                          </div>

                          <span className={styles.invoiceValor}>
                            {formatarValor(inv.valor)}
                          </span>
                        </div>

                        <div className={styles.invoiceRoute}>
                          <span>{inv.start_location || "—"}</span>
                          <span className={styles.routeArrow}>→</span>
                          <span>{inv.end_location || "—"}</span>
                        </div>

                        <div className={styles.invoiceFooter}>
                          <span>{formatarData(inv.data)}</span>
                          {inv.client_nif && <span>NIF {inv.client_nif}</span>}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}