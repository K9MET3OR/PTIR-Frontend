import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { obterShift, verificarTurnoAtivo } from "../../services/shiftService";
import { taxiService } from "../../services/taxiService";
import { refuelService } from "../../services/refuelService";
import styles from "./ReabastecimentoPage.module.css";

const toLocalInputValue = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offset);
  return local.toISOString().slice(0, 16);
};

const formatRemaining = (milliseconds) => {
  if (milliseconds <= 0) return "0m";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
};

export default function ReabastecimentoPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [shift, setShift] = useState(null);
  const [taxi, setTaxi] = useState(null);
  const [refuels, setRefuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [tempoRestante, setTempoRestante] = useState(0);
  const [form, setForm] = useState({
    data_inicio: "",
    data_fim: "",
    litros: "",
    kwh: "",
    euros_pagos: "",
    kms_taxi: "",
  });

  const shiftId = useMemo(() => localStorage.getItem("turno_id"), []);
  const motorEletrico = useMemo(
    () => String(taxi?.tipo_motor || "").toLowerCase().includes("elétr") ||
      String(taxi?.tipo_motor || "").toLowerCase().includes("eletrico"),
    [taxi]
  );

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
        setErro("Não há um turno ativo. Inicia um turno para registar reabastecimentos.");
        setLoading(false);
        return;
      }

      try {
        setShift(shiftData);

        const taxiResponse = await taxiService.get(shiftData.taxi_id);
        const taxiData = taxiResponse.taxi || taxiResponse;
        setTaxi(taxiData);

        setForm((current) => ({
          ...current,
          data_inicio: toLocalInputValue(shiftData.start_date),
          data_fim: toLocalInputValue(shiftData.end_date),
        }));

        const refuelResponse = await refuelService.listByTaxi(shiftData.taxi_id);
        setRefuels(refuelResponse.refuels || []);
      } catch (err) {
        console.error("Erro ao carregar reabastecimento:", err);
        setErro(err.message || "Erro ao carregar dados do turno e do táxi.");
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [shiftId, user]);

  useEffect(() => {
    if (!shift) {
      setTempoRestante(0);
      return;
    }

    const atualizar = () => {
      const agora = new Date();
      const fim = new Date(shift.end_date);
      setTempoRestante(Math.max(0, fim - agora));
    };

    atualizar();
    const timer = setInterval(atualizar, 1000);
    return () => clearInterval(timer);
  }, [shift]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validarFormulario = () => {
    setErro("");

    if (!form.data_inicio || !form.data_fim) {
      setErro("Preenche a data e hora de início e fim do reabastecimento.");
      return false;
    }

    const dataInicio = new Date(form.data_inicio);
    const dataFim = new Date(form.data_fim);
    const inicioValido = !Number.isNaN(dataInicio.getTime());
    const fimValido = !Number.isNaN(dataFim.getTime());

    if (!inicioValido || !fimValido) {
      setErro("As datas de início e fim devem ser válidas.");
      return false;
    }

    if (dataInicio >= dataFim) {
      setErro("A data de início deve ser anterior à data de fim.");
      return false;
    }

    if (!form.euros_pagos || Number.isNaN(Number(form.euros_pagos)) || Number(form.euros_pagos) <= 0) {
      setErro("Insere o valor em euros pagos e superior a 0.");
      return false;
    }

    if (form.kms_taxi === "" || Number.isNaN(Number(form.kms_taxi)) || Number(form.kms_taxi) < 0) {
      setErro("Insere os quilómetros do táxi e não podem ser negativos.");
      return false;
    }

    if (motorEletrico) {
      if (!form.kwh || Number.isNaN(Number(form.kwh)) || Number(form.kwh) <= 0) {
        setErro("Insere a energia em kWh e superior a 0.");
        return false;
      }
    } else {
      if (!form.litros || Number.isNaN(Number(form.litros)) || Number(form.litros) <= 0) {
        setErro("Insere a quantidade em litros e superior a 0.");
        return false;
      }
    }

    if (shift) {
      const turnoInicio = new Date(shift.start_date);
      const turnoFim = new Date(shift.end_date);

      if (motorEletrico) {
        if (dataInicio < turnoInicio || dataInicio > turnoFim) {
          setErro("Em táxis elétricos, o início do carregamento deve ocorrer dentro do turno.");
          return false;
        }
      } else {
        if (dataInicio < turnoInicio || dataFim > turnoFim) {
          setErro("Em táxis a combustão, o reabastecimento deve ocorrer dentro do turno.");
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validarFormulario()) return;
    if (!shift) return;

    setSaving(true);
    setErro("");
    setSucesso("");

    try {
      const payload = {
        shift: shift.id,
        data_inicio: new Date(form.data_inicio).toISOString(),
        data_fim: new Date(form.data_fim).toISOString(),
        euros_pagos: Number(form.euros_pagos),
        kms_taxi: Number(form.kms_taxi),
      };

      if (motorEletrico) {
        payload.kwh = Number(form.kwh);
      } else {
        payload.litros = Number(form.litros);
      }

      const response = await refuelService.register(payload);
      setSucesso("Reabastecimento registado com sucesso.");
      setErro("");
      setForm((current) => ({ ...current, litros: "", kwh: "", euros_pagos: "", kms_taxi: current.kms_taxi }));

      const novoRefuels = [response.refuel, ...(refuels || [])];
      setRefuels(novoRefuels);
    } catch (err) {
      console.error("Erro ao registar o reabastecimento:", err);
      setErro(err.message || "Erro ao registar o reabastecimento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <h1>Reabastecimento</h1>
          <p>Regista o abastecimento do táxi ligado ao teu turno.</p>
        </div>
        <button className={styles.backButton} onClick={() => navigate("/motorista/mapa")}>↩ Voltar</button>
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
                  <p>{taxi?.matricula ?? "—"} · {taxi?.tipo_motor ?? "—"}</p>
                </div>
                <div className={styles.timerBox}>
                  <span>Termina em</span>
                  <strong>{formatRemaining(tempoRestante)}</strong>
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.card}>
                  <h2>Dados do turno</h2>
                  <p><strong>Início:</strong> {new Date(shift.start_date).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</p>
                  <p><strong>Fim:</strong> {new Date(shift.end_date).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</p>
                  <p><strong>Táxi:</strong> {taxi?.marca} {taxi?.modelo}</p>
                  <p><strong>Motor:</strong> {taxi?.tipo_motor}</p>
                </div>

                <form className={styles.card} onSubmit={handleSubmit}>
                  <h2>Registar novo reabastecimento</h2>

                  <div className={styles.formRow}>
                    <label>
                      Início
                      <input
                        type="datetime-local"
                        value={form.data_inicio}
                        onChange={(e) => handleChange("data_inicio", e.target.value)}
                      />
                    </label>

                    <label>
                      Fim
                      <input
                        type="datetime-local"
                        value={form.data_fim}
                        onChange={(e) => handleChange("data_fim", e.target.value)}
                      />
                    </label>
                  </div>

                  <div className={styles.formRow}>
                    <label>
                      Tipo de motor
                      <input type="text" value={taxi?.tipo_motor || "—"} disabled />
                    </label>

                    {motorEletrico ? (
                      <label>
                        Energia (kWh)
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={form.kwh}
                          onChange={(e) => handleChange("kwh", e.target.value)}
                          placeholder="kWh"
                        />
                      </label>
                    ) : (
                      <label>
                        Litros
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={form.litros}
                          onChange={(e) => handleChange("litros", e.target.value)}
                          placeholder="Litros"
                        />
                      </label>
                    )}
                  </div>

                  <div className={styles.formRow}>
                    <label>
                      Euros pagos
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.euros_pagos}
                        onChange={(e) => handleChange("euros_pagos", e.target.value)}
                        placeholder="€"
                      />
                    </label>

                    <label>
                      Quilómetros do táxi
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.kms_taxi}
                        onChange={(e) => handleChange("kms_taxi", e.target.value)}
                        placeholder="km"
                      />
                    </label>
                  </div>

                  {erro && <div className={styles.erro}>{erro}</div>}
                  {sucesso && <div className={styles.sucesso}>{sucesso}</div>}

                  <button type="submit" className={styles.submitButton} disabled={saving}>
                    {saving ? "Guardando..." : "Registar Reabastecimento"}
                  </button>
                </form>
              </div>

              <div className={styles.card}>
                <h2>Últimos reabastecimentos</h2>
                {refuels.length === 0 ? (
                  <p>Sem reabastecimentos registados para este táxi.</p>
                ) : (
                  <div className={styles.refuelList}>
                    {refuels.map((item) => (
                      <div key={item.id} className={styles.refuelItem}>
                        <div>
                          <strong>{new Date(item.data_inicio).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</strong>
                          <p>{item.tipo === "eletrico" ? `${item.kwh} kWh` : `${item.litros} L`}</p>
                        </div>
                        <div className={styles.refuelMeta}>
                          <span>{item.kms_taxi} km</span>
                          <span>€{item.euros_pagos}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
