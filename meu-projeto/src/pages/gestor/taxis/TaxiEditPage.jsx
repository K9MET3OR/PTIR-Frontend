import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { taxiService } from "../../../services/taxiService";
import styles from "../../../styles/Form.module.css";

const MOTOR_TYPES  = ["Gasolina", "Diesel", "Elétrico", "Híbrido"];
const COMFORT_TYPES = ["Standard", "Conforto", "Premium"];

// Valida matrícula portuguesa: XX-00-XX, 00-XX-00, etc.
function validateMatricula(v) {
  return /^[A-Z]{2}-\d{2}-[A-Z]{2}$|^\d{2}-[A-Z]{2}-\d{2}$|^\d{2}-\d{2}-[A-Z]{2}$/.test(v.toUpperCase());
}

export default function TaxiEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
    matricula:    "",
    marca:        "",
    modelo:       "",
    ano_compra:   "",
    consumo_medio: "",
    tipo_motor:   "Gasolina",
    nivel_conforto: "Standard",
    observacoes:  "",
  });

  const [originalForm, setOriginalForm] = useState(null);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Carregar dados do táxi
  useEffect(() => {
    taxiService.get(id)
      .then((response) => {
        const taxi = response?.taxi || response;
        const taxiData = {
          matricula:      taxi.matricula || "",
          marca:          taxi.marca || "",
          modelo:         taxi.modelo || "",
          ano_compra:     taxi.ano_compra || "",
          consumo_medio:  taxi.consumo_medio ?? "",
          tipo_motor:     taxi.tipo_motor || "Gasolina",
          nivel_conforto: taxi.nivel_conforto || "Standard",
          observacoes:    taxi.observacoes || "",
        };
        setForm(taxiData);
        setOriginalForm(taxiData);
      })
      .catch(() => setApiError("Não foi possível carregar os dados do táxi."))
      .finally(() => setLoading(false));
  }, [id]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    // Limpa o erro do campo quando o utilizador começa a escrever
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate() {
    const e = {};
    
    // Para edição, validar apenas campos que foram alterados
    if (form.matricula !== originalForm?.matricula) {
      if (!form.matricula)
        e.matricula = "Matrícula obrigatória.";
      else if (!validateMatricula(form.matricula))
        e.matricula = "Formato inválido. Ex: AA-00-BB";
    }

    if (form.marca !== originalForm?.marca && !form.marca)
      e.marca = "Marca obrigatória.";

    if (form.modelo !== originalForm?.modelo && !form.modelo)
      e.modelo = "Modelo obrigatório.";

    if (form.ano_compra !== originalForm?.ano_compra) {
      const ano = parseInt(form.ano_compra, 10);
      if (!form.ano_compra)
        e.ano_compra = "Ano obrigatório.";
      else if (ano < 1990 || ano > new Date().getFullYear())
        e.ano_compra = `Ano entre 1990 e ${new Date().getFullYear()}.`;
    }

    if (form.consumo_medio !== originalForm?.consumo_medio) {
      const consumo = parseFloat(form.consumo_medio);
      if (!form.consumo_medio)
        e.consumo_medio = "Consumo médio obrigatório.";
      else if (Number.isNaN(consumo) || consumo <= 0)
        e.consumo_medio = "Consumo médio deve ser maior que 0.";
    }

    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }

    setSubmitting(true);
    setApiError("");
    
    // Enviar apenas os campos alterados
    const changes = {};
    if (form.matricula !== originalForm?.matricula) 
      changes.matricula = form.matricula.toUpperCase();
    if (form.marca !== originalForm?.marca)
      changes.marca = form.marca;
    if (form.modelo !== originalForm?.modelo)
      changes.modelo = form.modelo;
    if (form.ano_compra !== originalForm?.ano_compra)
      changes.ano_compra = parseInt(form.ano_compra, 10);
    if (form.consumo_medio !== originalForm?.consumo_medio)
      changes.consumo_medio = parseFloat(form.consumo_medio);
    if (form.tipo_motor !== originalForm?.tipo_motor)
      changes.tipo_motor = form.tipo_motor;
    if (form.nivel_conforto !== originalForm?.nivel_conforto)
      changes.nivel_conforto = form.nivel_conforto;
    if (form.observacoes !== originalForm?.observacoes)
      changes.observacoes = form.observacoes;

    try {
      await taxiService.update(id, changes);
      navigate("/gestor/taxis");
    } catch (err) {
      setApiError(err.message ?? "Erro ao atualizar táxi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <button className={styles.backBtn} onClick={() => navigate("/gestor/taxis")}>
          ← Voltar à lista
        </button>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>A carregar…</h1>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className={styles.backBtn} onClick={() => navigate("/gestor/taxis")}>
        ← Voltar à lista
      </button>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Editar táxi</h1>
        <p className={styles.pageSubtitle}>Atualiza os dados do veículo</p>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
        <div className={styles.grid}>

          <div className={styles.field}>
            <label>Matrícula *</label>
            <input
              placeholder="AA-00-BB"
              value={form.matricula}
              onChange={(e) => set("matricula", e.target.value)}
              style={{ textTransform: "uppercase" }}
            />
            {errors.matricula && <span className={styles.fieldError}>{errors.matricula}</span>}
          </div>

          <div className={styles.field}>
            <label>Ano de compra *</label>
            <input
              type="number"
              placeholder="2024"
              value={form.ano_compra}
              onChange={(e) => set("ano_compra", e.target.value)}
            />
            {errors.ano_compra && <span className={styles.fieldError}>{errors.ano_compra}</span>}
          </div>

          <div className={styles.field}>
            <label>Consumo médio (L/100km) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="6.50"
              value={form.consumo_medio}
              onChange={(e) => set("consumo_medio", e.target.value)}
            />
            {errors.consumo_medio && <span className={styles.fieldError}>{errors.consumo_medio}</span>}
          </div>

          <div className={styles.field}>
            <label>Marca *</label>
            <input
              placeholder="Toyota"
              value={form.marca}
              onChange={(e) => set("marca", e.target.value)}
            />
            {errors.marca && <span className={styles.fieldError}>{errors.marca}</span>}
          </div>

          <div className={styles.field}>
            <label>Modelo *</label>
            <input
              placeholder="Corolla"
              value={form.modelo}
              onChange={(e) => set("modelo", e.target.value)}
            />
            {errors.modelo && <span className={styles.fieldError}>{errors.modelo}</span>}
          </div>

          <div className={styles.field}>
            <label>Tipo de motor *</label>
            <select value={form.tipo_motor} onChange={(e) => set("tipo_motor", e.target.value)}>
              {MOTOR_TYPES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label>Nível de conforto *</label>
            <select value={form.nivel_conforto} onChange={(e) => set("nivel_conforto", e.target.value)}>
              {COMFORT_TYPES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label>Observações</label>
            <textarea
              rows={3}
              placeholder="Informações adicionais sobre o veículo..."
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </div>
        </div>

        {apiError && <p className={styles.apiError}>{apiError}</p>}

        <div className={styles.actions}>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? "A guardar…" : "Guardar alterações →"}
          </button>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => navigate("/gestor/taxis")}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
