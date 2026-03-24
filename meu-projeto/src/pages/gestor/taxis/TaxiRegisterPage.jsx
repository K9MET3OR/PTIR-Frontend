import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { taxiService } from "../../../services/taxiService";
import styles from "../../../styles/Form.module.css";

const MOTOR_TYPES  = ["Gasolina", "Diesel", "Elétrico", "Híbrido"];
const COMFORT_TYPES = ["Standard", "Conforto", "Premium"];

// Valida matrícula portuguesa: XX-00-XX, 00-XX-00, etc.
function validateMatricula(v) {
  return /^[A-Z]{2}-\d{2}-[A-Z]{2}$|^\d{2}-[A-Z]{2}-\d{2}$|^\d{2}-\d{2}-[A-Z]{2}$/.test(v.toUpperCase());
}

export default function TaxiRegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    matricula:    "",
    marca:        "",
    modelo:       "",
    ano_compra:   "",
    tipo_motor:   "Gasolina",
    nivel_conforto: "Standard",
    observacoes:  "",
  });

  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    // Limpa o erro do campo quando o utilizador começa a escrever
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate() {
    const e = {};
    if (!form.matricula)
      e.matricula = "Matrícula obrigatória.";
    else if (!validateMatricula(form.matricula))
      e.matricula = "Formato inválido. Ex: AA-00-BB";

    if (!form.marca)   e.marca  = "Marca obrigatória.";
    if (!form.modelo)  e.modelo = "Modelo obrigatório.";

    const ano = parseInt(form.ano_compra, 10);
    if (!form.ano_compra)           e.ano_compra = "Ano obrigatório.";
    else if (ano < 1990 || ano > new Date().getFullYear())
      e.ano_compra = `Ano entre 1990 e ${new Date().getFullYear()}.`;

    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }

    setLoading(true);
    setApiError("");
    try {
      await taxiService.create({
        ...form,
        matricula:  form.matricula.toUpperCase(),
        ano_compra: parseInt(form.ano_compra, 10),
      });
      navigate("/gestor/taxis");
    } catch (err) {
      setApiError(err.message ?? "Erro ao registar táxi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className={styles.backBtn} onClick={() => navigate("/gestor/taxis")}>
        ← Voltar à lista
      </button>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Registar táxi</h1>
        <p className={styles.pageSubtitle}>Preenche os dados do novo veículo</p>
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
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "A registar…" : "Registar táxi →"}
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