import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { obterShift, verificarTurnoAtivo } from "../../services/shiftService";
import { invoiceService } from "../../services/invoiceService";
import { listarViagensFinalizadasMotorista } from "../../services/tripService";
import styles from "./FaturaPage.module.css";

export default function FaturaPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [shift, setShift] = useState(null);
  const [trips, setTrips] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [tripSelecionada, setTripSelecionada] = useState("");

  const shiftId = useMemo(() => localStorage.getItem("turno_id"), []);

  useEffect(() => {
    async function carregarDados() {
      let shiftData = null;
      const storedShiftId = localStorage.getItem("turno_id");

      if (storedShiftId) {
        try {
          const shiftResponse = await obterShift(storedShiftId);
          const candidate = shiftResponse.shift || shiftResponse;
          if (candidate && candidate.id) {
            shiftData = candidate;
          } else {
            localStorage.removeItem("turno_id");
            localStorage.removeItem("turno_ativo");
          }
        } catch (error) {
          console.warn("Erro ao carregar turno pelo ID armazenado:", error);
          localStorage.removeItem("turno_id");
          localStorage.removeItem("turno_ativo");
        }
      }

      if (!shiftData && user?.id) {
        try {
          const turnoAtivo = await verificarTurnoAtivo(user.id);
          if (turnoAtivo?.id) {
            shiftData = turnoAtivo;
            localStorage.setItem("turno_id", turnoAtivo.id);
            localStorage.setItem("turno_ativo", "true");
          }
        } catch (error) {
          console.warn("Erro ao verificar turno ativo do motorista:", error);
        }
      }

      if (!shiftData) {
        setErro("Não há um turno ativo. Inicia um turno para emitir faturas.");
        setLoading(false);
        return;
      }

      try {
        setShift(shiftData);

        // Carregar viagens finalizadas do motorista
        const tripsResponse = await listarViagensFinalizadasMotorista(user.id);
        const todasViagens = tripsResponse.trips || [];

        // Carregar faturas já emitidas pelo motorista
        const invoicesResponse = await invoiceService.listByDriver(user.id);
        const invoicesList = invoicesResponse.invoices || [];
        setInvoices(invoicesList);

        const invoiceTripIds = new Set(invoicesList.map((inv) => inv.trip_id));
        const semFatura = todasViagens.filter(
          (t) => t.status_trip === "finished" && !invoiceTripIds.has(t.id)
        );
        setTrips(semFatura);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setErro(err.message || "Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [shiftId, user]);

  const tripSelecionadaObj = useMemo(
    () => trips.find((t) => t.id === tripSelecionada) || null,
    [trips, tripSelecionada]
  );

  const handleEmitir = async () => {
    setErro("");
    setSucesso("");

    if (!tripSelecionada) {
      setErro("Seleciona uma viagem para emitir a fatura.");
      return;
    }

    setSaving(true);

    try {
      const response = await invoiceService.register({ trip_id: tripSelecionada });
      const novaFatura = response.invoice;

      setSucesso(`Fatura ${novaFatura.numero_formatado} emitida com sucesso.`);
      setTripSelecionada("");

      // Remove a viagem da lista e adiciona a fatura no topo
      setTrips((current) => current.filter((t) => t.id !== tripSelecionada));
      setInvoices((current) => [novaFatura, ...current]);
    } catch (err) {
      console.error("Erro ao emitir fatura:", err);
      setErro(err.message || "Erro ao emitir fatura.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <h1>Faturas</h1>
          <p>Emite faturas para as viagens finalizadas do teu turno.</p>
        </div>
        <button className={styles.backButton} onClick={() => navigate("/motorista/mapa")}>
          ↩ Voltar
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>A carregar dados do turno...</div>
      ) : (
        <>
          {!shift ? (
            <div className={styles.emptyState}>
              <p>Não foi possível encontrar um turno ativo.</p>
              <button onClick={() => navigate("/motorista/turno")}>Iniciar Turno</button>
            </div>
          ) : (
            <>
              <div className={styles.statusBar}>
                <div>
                  <span className={styles.statusLabel}>Turno ativo</span>
                  <p>
                    {new Date(shift.start_date).toLocaleString("pt-PT", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}{" "}
                    →{" "}
                    {new Date(shift.end_date).toLocaleString("pt-PT", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className={styles.statsBox}>
                  <span>{invoices.length} fatura{invoices.length !== 1 ? "s" : ""} emitida{invoices.length !== 1 ? "s" : ""}</span>
                  <span>{trips.length} viagem{trips.length !== 1 ? "s" : ""} por faturar</span>
                </div>
              </div>

              <div className={styles.grid}>
                {/* Painel de emissão */}
                <div className={styles.card}>
                  <h2>Emitir nova fatura</h2>

                  {trips.length === 0 ? (
                    <p className={styles.semViagens}>
                      Não há viagens finalizadas pendentes de faturação.
                    </p>
                  ) : (
                    <>
                      <label className={styles.fieldLabel}>
                        Seleciona a viagem
                        <select
                          className={styles.select}
                          value={tripSelecionada}
                          onChange={(e) => {
                            setTripSelecionada(e.target.value);
                            setErro("");
                            setSucesso("");
                          }}
                        >
                          <option value="">— Escolhe uma viagem —</option>
                          {trips.map((t) => (
                            <option key={t.id} value={t.id}>
                              {new Date(t.start_date).toLocaleString("pt-PT", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}{" "}
                              · {t.morada_inicio ?? "—"} → {t.morada_fim ?? "—"} · €
                              {Number(t.price).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </label>

                      {tripSelecionadaObj && (
                        <div className={styles.tripPreview}>
                          <div className={styles.tripRow}>
                            <span>Início</span>
                            <strong>
                              {new Date(tripSelecionadaObj.start_date).toLocaleString("pt-PT", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </strong>
                          </div>
                          <div className={styles.tripRow}>
                            <span>Fim</span>
                            <strong>
                              {new Date(tripSelecionadaObj.end_date).toLocaleString("pt-PT", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </strong>
                          </div>
                          <div className={styles.tripRow}>
                            <span>Pessoas</span>
                            <strong>{tripSelecionadaObj.n_pessoas ?? "—"}</strong>
                          </div>
                          <div className={styles.tripRow}>
                            <span>Quilómetros</span>
                            <strong>{tripSelecionadaObj.kms ?? "—"} km</strong>
                          </div>
                          <div className={`${styles.tripRow} ${styles.tripRowValor}`}>
                            <span>Valor a faturar</span>
                            <strong>€{Number(tripSelecionadaObj.price).toFixed(2)}</strong>
                          </div>
                        </div>
                      )}

                      {erro && <div className={styles.erro}>{erro}</div>}
                      {sucesso && <div className={styles.sucesso}>{sucesso}</div>}

                      <button
                        className={styles.submitButton}
                        onClick={handleEmitir}
                        disabled={saving || !tripSelecionada}
                      >
                        {saving ? "A emitir..." : "Emitir Fatura"}
                      </button>
                    </>
                  )}

                  {trips.length === 0 && erro && (
                    <div className={styles.erro}>{erro}</div>
                  )}
                  {trips.length === 0 && sucesso && (
                    <div className={styles.sucesso}>{sucesso}</div>
                  )}
                </div>

                {/* Lista de faturas emitidas */}
                <div className={styles.card}>
                  <h2>Faturas emitidas</h2>
                  {invoices.length === 0 ? (
                    <p className={styles.semViagens}>Ainda não emitiste nenhuma fatura.</p>
                  ) : (
                    <div className={styles.invoiceList}>
                      {invoices.map((inv) => (
                        <div key={inv.id} className={styles.invoiceItem}>
                          <div>
                            <strong className={styles.invoiceNum}>{inv.numero_formatado}</strong>
                            <p>
                              {new Date(inv.data).toLocaleString("pt-PT", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </p>
                          </div>
                          <div className={styles.invoiceMeta}>
                            <span className={styles.invoiceValor}>
                              €{Number(inv.valor).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}