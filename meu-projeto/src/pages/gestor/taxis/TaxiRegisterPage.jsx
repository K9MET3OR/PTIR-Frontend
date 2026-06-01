import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { taxiService } from "../../../services/taxiService";
import styles from "../../../styles/Form.module.css";

const MOTOR_TYPES = ["Combustão", "Elétrico"];
const COMFORT_TYPES = ["Básico", "Luxuoso"];

// Listas predefinidas de marcas e modelos
const TAXI_BRANDS = [
  { brand: "Toyota", models: ["Prius", "Corolla", "Camry", "Yaris"] },
  { brand: "Hyundai", models: ["Ioniq", "i30", "i20", "Elantra"] },
  { brand: "Kia", models: ["Niro", "Ceed", "Picanto", "Sportage"] },
  { brand: "Mercedes-Benz", models: ["E-Class", "C-Class", "A-Class", "V-Class"] },
  { brand: "BMW", models: ["3 Series", "5 Series", "1 Series", "X5"] },
  { brand: "Volkswagen", models: ["Passat", "Golf", "Polo", "Tiguan"] },
  { brand: "Renault", models: ["Megane", "Clio", "Espace", "Scenic"] },
  { brand: "Peugeot", models: ["308", "307", "3008", "5008"] },
  { brand: "Citroën", models: ["C5", "C3", "C-Elysée", "Berlingo"] },
  { brand: "Fiat", models: ["500", "Panda", "Tipo", "Ducato"] },
  { brand: "Nissan", models: ["Qashqai", "Altima", "Micra", "X-Trail"] },
  { brand: "Chevrolet", models: ["Cruze", "Spark", "Cobalt", "Onix"] },
];

// Valida matrícula portuguesa: XX-00-XX, 00-XX-00, etc.
function validateMatricula(v) {
  return /^([A-Z]{2}-\d{2}-[A-Z]{2}|[A-Z]{2}-\d{2}-\d{2}|\d{2}-[A-Z]{2}-\d{2}|\d{2}-\d{2}-[A-Z]{2})$/.test(
    v.toUpperCase()
  );
}
function formatMatricula(value) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return `${clean.slice(0, 2)}-${clean.slice(2)}`;
  return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4)}`;
}

export default function TaxiRegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    matricula: "",
    marca: "",
    modelo: "",
    ano_compra: "",
    consumo_medio: "",
    tipo_motor: "Combustão",
    nivel_conforto: "Básico",
    observacoes: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Obter modelos disponíveis para a marca selecionada
  const getAvailableModels = () => {
    const brandObj = TAXI_BRANDS.find((b) => b.brand === form.marca);
    return brandObj ? brandObj.models : [];
  };

  function set(field, value) {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      // Se a marca muda, reseta o modelo
      if (field === "marca") {
        updated.modelo = "";
      }
      return updated;
    });
    // Limpa o erro do campo quando o utilizador começa a escrever
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate() {
    const e = {};
    if (!form.matricula)
      e.matricula = "Matrícula obrigatória.";
    else if (!validateMatricula(form.matricula))
      e.matricula = "Formato inválido. Ex: AA-00-BB ou AA-00-00";

    if (!form.marca) e.marca = "Marca obrigatória.";
    if (!form.modelo) e.modelo = "Modelo obrigatório.";

    const ano = parseInt(form.ano_compra, 10);
    if (!form.ano_compra) e.ano_compra = "Ano obrigatório.";
    else if (ano < 1990 || ano > new Date().getFullYear())
      e.ano_compra = `Ano entre 1990 e ${new Date().getFullYear()}.`;

    const consumo = parseFloat(form.consumo_medio);
    if (!form.consumo_medio) e.consumo_medio = "Consumo médio obrigatório.";
    else if (Number.isNaN(consumo) || consumo <= 0)
      e.consumo_medio = "Consumo médio deve ser maior que 0.";

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
        matricula: form.matricula.toUpperCase(),
        ano_compra: parseInt(form.ano_compra, 10),
        consumo_medio: parseFloat(form.consumo_medio),
        observacoes: form.observacoes.trim(),
      });

      alert("Táxi registado com sucesso!");
      navigate("/gestor/taxis");
    } catch (err) {
      setApiError(err.message ?? "Erro ao registar táxi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
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
              className={styles.input}
              placeholder="AA-00-BB"
              value={form.matricula}
              onChange={(e) => set("matricula", formatMatricula(e.target.value))}
              maxLength={8}
            />
            {errors.matricula && <span className={styles.fieldError}>{errors.matricula}</span>}
          </div>

          <div className={styles.field}>
            <label>Ano de compra *</label>
            <input
              className={styles.input}
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
              className={styles.input}
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
            <select
              className={styles.select}
              value={form.marca}
              onChange={(e) => set("marca", e.target.value)}
            >
              <option value="">Selecione uma marca</option>
              {TAXI_BRANDS.map((b) => (
                <option key={b.brand} value={b.brand}>
                  {b.brand}
                </option>
              ))}
            </select>
            {errors.marca && <span className={styles.fieldError}>{errors.marca}</span>}
          </div>

          <div className={styles.field}>
            <label>Modelo *</label>
            <select
              className={styles.select}
              value={form.modelo}
              onChange={(e) => set("modelo", e.target.value)}
              disabled={!form.marca}
            >
              <option value="">
                {form.marca ? "Selecione um modelo" : "Selecione primeiro uma marca"}
              </option>
              {getAvailableModels().map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            {errors.modelo && <span className={styles.fieldError}>{errors.modelo}</span>}
          </div>

          <div className={styles.field}>
            <label>Tipo de motor *</label>
            <select className={styles.select} value={form.tipo_motor} onChange={(e) => set("tipo_motor", e.target.value)}>
              {MOTOR_TYPES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label>Nível de conforto *</label>
            <select className={styles.select} value={form.nivel_conforto} onChange={(e) => set("nivel_conforto", e.target.value)}>
              {COMFORT_TYPES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label>Observações</label>
            <textarea
              className={styles.textarea}
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