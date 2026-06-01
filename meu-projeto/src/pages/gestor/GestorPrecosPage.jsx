import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useFeedback } from "../../context/FeedbackContext";
import styles from "./GestorPrecosPage.module.css";

const CONFORTO_OPTS = ["Básico", "Luxuoso"];

function agoraDatetimeLocal() {
  const now = new Date();
  now.setSeconds(0, 0);

  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);

  return local.toISOString().slice(0, 16);
}

function adicionarMinutosDatetimeLocal(minutos) {
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(now.getMinutes() + minutos);

  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);

  return local.toISOString().slice(0, 16);
}

export default function GestorPrecosPage() {
  const feedback = useFeedback();

  const [form, setForm] = useState({
    preco_basico_minuto: "",
    preco_luxuoso_minuto: "",
    agravamento_noturno_percentual: "",
  });

  const [simulacao, setSimulacao] = useState({
    start_datetime: agoraDatetimeLocal(),
    end_datetime: adicionarMinutosDatetimeLocal(90),
    nivel_conforto: "Luxuoso",
  });

  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarPrecos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarPrecos() {
    try {
      setLoading(true);
      setErro("");

      const data = await api.get("/taxi/pricing");
      const pricing = data?.pricing;

      if (!pricing) {
        throw new Error("Configuração de preços não encontrada.");
      }

      setForm({
        preco_basico_minuto: String(pricing.preco_basico_minuto ?? ""),
        preco_luxuoso_minuto: String(pricing.preco_luxuoso_minuto ?? ""),
        agravamento_noturno_percentual: String(
          pricing.agravamento_noturno_percentual ?? ""
        ),
      });
    } catch (error) {
      console.error("Erro ao carregar preços:", error);

      const message = error.message || "Erro ao carregar preços.";
      setErro(message);
      feedback.error(message);
    } finally {
      setLoading(false);
    }
  }

  function atualizarCampo(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErro("");
    setMensagem("");
  }

  function atualizarSimulacao(field, value) {
    setSimulacao((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErro("");
    setResultado(null);
  }

  function validarPrecos() {
    const basico = Number(form.preco_basico_minuto);
    const luxuoso = Number(form.preco_luxuoso_minuto);
    const agravamento = Number(form.agravamento_noturno_percentual);

    if (!basico || Number.isNaN(basico) || basico <= 0) {
      return "O preço por minuto do nível Básico deve ser maior que 0.";
    }

    if (!luxuoso || Number.isNaN(luxuoso) || luxuoso <= 0) {
      return "O preço por minuto do nível Luxuoso deve ser maior que 0.";
    }

    if (Number.isNaN(agravamento) || agravamento < 0) {
      return "O agravamento noturno não pode ser negativo.";
    }

    return null;
  }

  async function guardarPrecos(e) {
    e.preventDefault();

    const erroValidacao = validarPrecos();

    if (erroValidacao) {
      setErro(erroValidacao);
      feedback.warning(erroValidacao);
      return;
    }

    try {
      setSaving(true);
      setErro("");
      setMensagem("");

      const data = await api.patch("/taxi/pricing", {
        preco_basico_minuto: Number(form.preco_basico_minuto),
        preco_luxuoso_minuto: Number(form.preco_luxuoso_minuto),
        agravamento_noturno_percentual: Number(
          form.agravamento_noturno_percentual
        ),
      });

      const pricing = data?.pricing;

      if (pricing) {
        setForm({
          preco_basico_minuto: String(pricing.preco_basico_minuto ?? ""),
          preco_luxuoso_minuto: String(pricing.preco_luxuoso_minuto ?? ""),
          agravamento_noturno_percentual: String(
            pricing.agravamento_noturno_percentual ?? ""
          ),
        });
      }

      const message = "Preços atualizados com sucesso.";
      setMensagem(message);
      feedback.success(message);
    } catch (error) {
      console.error("Erro ao guardar preços:", error);

      const message = error.message || "Erro ao guardar preços.";
      setErro(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function calcularSimulacao(e) {
    e.preventDefault();

    if (!simulacao.start_datetime || !simulacao.end_datetime) {
      const message = "Preenche a data/hora de início e fim da simulação.";
      setErro(message);
      feedback.warning(message);
      return;
    }

    const inicio = new Date(simulacao.start_datetime);
    const fim = new Date(simulacao.end_datetime);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      const message = "Datas inválidas.";
      setErro(message);
      feedback.warning(message);
      return;
    }

    if (fim <= inicio) {
      const message = "A data/hora de fim deve ser posterior à data/hora de início.";
      setErro(message);
      feedback.warning(message);
      return;
    }

    try {
      setCalculating(true);
      setErro("");
      setResultado(null);

      const data = await api.post("/taxi/pricing/simular", {
        start_datetime: simulacao.start_datetime,
        end_datetime: simulacao.end_datetime,
        nivel_conforto: simulacao.nivel_conforto,
      });

      setResultado(data);
      feedback.success("Simulação calculada com sucesso.");
    } catch (error) {
      console.error("Erro ao simular preço:", error);

      const message = error.message || "Erro ao simular preço.";
      setErro(message);
      feedback.error(message);
    } finally {
      setCalculating(false);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Preços do serviço</h1>
        <p className={styles.pageSubtitle}>
          Define o preço por minuto e testa viagens fictícias.
        </p>
      </div>

      {loading ? (
        <div className={styles.card}>
          <p className={styles.loadingText}>A carregar preços...</p>
        </div>
      ) : (
        <div className={styles.grid}>
          <form className={styles.card} onSubmit={guardarPrecos}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Configuração atual</h2>
                <p className={styles.cardSubtitle}>
                  Aplicada automaticamente aos pedidos de viagem.
                </p>
              </div>
              <span className={styles.cardIcon}>💶</span>
            </div>

            <div className={styles.field}>
              <label>Preço por minuto — Básico</label>
              <div className={styles.inputWithSuffix}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.preco_basico_minuto}
                  onChange={(e) =>
                    atualizarCampo("preco_basico_minuto", e.target.value)
                  }
                />
                <span>€/min</span>
              </div>
            </div>

            <div className={styles.field}>
              <label>Preço por minuto — Luxuoso</label>
              <div className={styles.inputWithSuffix}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.preco_luxuoso_minuto}
                  onChange={(e) =>
                    atualizarCampo("preco_luxuoso_minuto", e.target.value)
                  }
                />
                <span>€/min</span>
              </div>
            </div>

            <div className={styles.field}>
              <label>Agravamento noturno</label>
              <div className={styles.inputWithSuffix}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.agravamento_noturno_percentual}
                  onChange={(e) =>
                    atualizarCampo(
                      "agravamento_noturno_percentual",
                      e.target.value
                    )
                  }
                />
                <span>%</span>
              </div>
              <p className={styles.hint}>Aplicado entre as 21h e as 6h.</p>
            </div>

            <button className={styles.primaryBtn} disabled={saving}>
              {saving ? "A guardar..." : "Guardar preços"}
            </button>
          </form>

          <form className={styles.card} onSubmit={calcularSimulacao}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Simular viagem fictícia</h2>
                <p className={styles.cardSubtitle}>
                  Calcula o custo entre uma hora de início e fim.
                </p>
              </div>
              <span className={styles.cardIcon}>🧮</span>
            </div>

            <div className={styles.field}>
              <label>Nível de conforto</label>
              <select
                value={simulacao.nivel_conforto}
                onChange={(e) =>
                  atualizarSimulacao("nivel_conforto", e.target.value)
                }
              >
                {CONFORTO_OPTS.map((nivel) => (
                  <option key={nivel} value={nivel}>
                    {nivel}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Início</label>
              <input
                type="datetime-local"
                value={simulacao.start_datetime}
                onChange={(e) =>
                  atualizarSimulacao("start_datetime", e.target.value)
                }
              />
            </div>

            <div className={styles.field}>
              <label>Fim</label>
              <input
                type="datetime-local"
                value={simulacao.end_datetime}
                onChange={(e) =>
                  atualizarSimulacao("end_datetime", e.target.value)
                }
              />
            </div>

            <button className={styles.secondaryBtn} disabled={calculating}>
              {calculating ? "A calcular..." : "Calcular viagem fictícia"}
            </button>

            {resultado && (
              <div className={styles.resultBox}>
                <div className={styles.resultPrice}>
                  {Number(resultado.price).toFixed(2)} €
                </div>

                <div className={styles.resultLine}>
                  <span>Minutos diurnos:</span>
                  <strong>{resultado.breakdown?.day_minutes ?? 0}</strong>
                </div>

                <div className={styles.resultLine}>
                  <span>Minutos noturnos:</span>
                  <strong>{resultado.breakdown?.night_minutes ?? 0}</strong>
                </div>

                <div className={styles.resultLine}>
                  <span>Preço/minuto:</span>
                  <strong>
                    {Number(resultado.breakdown?.price_per_minute || 0).toFixed(2)} €
                  </strong>
                </div>

                <div className={styles.resultLine}>
                  <span>Agravamento noite:</span>
                  <strong>
                    {Number(
                      resultado.breakdown?.night_surcharge_percent || 0
                    ).toFixed(2)}
                    %
                  </strong>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {erro && <div className={styles.errorBox}>{erro}</div>}
      {mensagem && <div className={styles.successBox}>{mensagem}</div>}
    </div>
  );
}