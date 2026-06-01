import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { taxiService } from "../../../services/taxiService";
import { listarViagens } from "../../../services/tripService";
import styles from "../../../styles/Form.module.css";

const MOTOR_TYPES = ["Combustão", "Elétrico"];
const COMFORT_TYPES = ["Básico", "Luxuoso"];

const ESTADOS_VIAGEM_COM_CLIENTES = [
  "in_progress",
  "awaiting_payment",
  "finished",
];

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

function validateMatricula(v) {
  return /^[A-Z]{2}-\d{2}-[A-Z]{2}$|^\d{2}-[A-Z]{2}-\d{2}$|^\d{2}-\d{2}-[A-Z]{2}$/.test(
    v.toUpperCase()
  );
}

function formatMatricula(value) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return `${clean.slice(0, 2)}-${clean.slice(2)}`;
  return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4)}`;
}

function mesmoTaxiDaViagem(trip, taxi) {
  if (!trip || !taxi) return false;

  const tripTaxiId =
    trip.taxi_id ||
    trip.taxi?.id ||
    trip.taxi?.id_taxi ||
    trip.taxi;

  const taxiId = taxi.id || taxi.id_taxi;

  return tripTaxiId && taxiId && String(tripTaxiId) === String(taxiId);
}

function viagemContaComoViagemComCliente(trip) {
  return ESTADOS_VIAGEM_COM_CLIENTES.includes(trip.status_trip);
}

export default function TaxiEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();

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

  const [originalForm, setOriginalForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [confortoBloqueado, setConfortoBloqueado] = useState(false);

  useEffect(() => {
    async function carregarTaxi() {
      try {
        const response = await taxiService.get(id);
        const taxi = response?.taxi || response;

        const taxiData = {
          matricula: taxi.matricula || "",
          marca: taxi.marca || "",
          modelo: taxi.modelo || "",
          ano_compra: taxi.ano_compra || "",
          consumo_medio: taxi.consumo_medio ?? "",
          tipo_motor: taxi.tipo_motor || "Combustão",
          nivel_conforto: taxi.nivel_conforto || "Básico",
          observacoes: taxi.observacoes || "",
        };

        setForm(taxiData);
        setOriginalForm(taxiData);

        const viagensResponse = await listarViagens();
        const trips = viagensResponse?.trips || [];

        const temViagensComClientes = trips.some((trip) => {
          return mesmoTaxiDaViagem(trip, taxi) && viagemContaComoViagemComCliente(trip);
        });

        setConfortoBloqueado(temViagensComClientes);
      } catch (error) {
        console.error("Erro ao carregar dados do táxi:", error);
        setApiError("Não foi possível carregar os dados do táxi.");
      } finally {
        setLoading(false);
      }
    }

    carregarTaxi();
  }, [id]);

  function getAvailableModels() {
    const brandObj = TAXI_BRANDS.find((b) => b.brand === form.marca);
    return brandObj ? brandObj.models : [];
  }

  function set(field, value) {
    setForm((f) => {
      const updated = { ...f, [field]: value };

      if (field === "marca") {
        updated.modelo = "";
      }

      return updated;
    });

    if (errors[field]) {
      setErrors((e) => ({ ...e, [field]: "" }));
    }

    if (field === "marca" && errors.modelo) {
      setErrors((e) => ({ ...e, modelo: "" }));
    }

    if (apiError) {
      setApiError("");
    }
  }

  function validate() {
    const e = {};

    if (!form.matricula) {
      e.matricula = "Matrícula obrigatória.";
    } else if (!validateMatricula(form.matricula)) {
      e.matricula = "Formato inválido. Ex: AA-00-BB";
    }

    if (!form.marca) {
      e.marca = "Marca obrigatória.";
    }

    if (!form.modelo) {
      e.modelo = "Modelo obrigatório.";
    }

    const brandObj = TAXI_BRANDS.find((b) => b.brand === form.marca);
    if (form.marca && brandObj && !brandObj.models.includes(form.modelo)) {
      e.modelo = "Modelo inválido para a marca selecionada.";
    }

    const ano = parseInt(form.ano_compra, 10);
    if (!form.ano_compra) {
      e.ano_compra = "Ano obrigatório.";
    } else if (ano < 1990 || ano > new Date().getFullYear()) {
      e.ano_compra = `Ano entre 1990 e ${new Date().getFullYear()}.`;
    }

    const consumo = parseFloat(form.consumo_medio);
    if (!form.consumo_medio) {
      e.consumo_medio = "Consumo médio obrigatório.";
    } else if (Number.isNaN(consumo) || consumo <= 0) {
      e.consumo_medio = "Consumo médio deve ser maior que 0.";
    }

    if (
      confortoBloqueado &&
      form.nivel_conforto !== originalForm?.nivel_conforto
    ) {
      e.nivel_conforto =
        "O nível de conforto não pode ser alterado porque este táxi já fez viagens com clientes.";
    }

    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const e2 = validate();
    if (Object.keys(e2).length) {
      setErrors(e2);
      return;
    }

    setSubmitting(true);
    setApiError("");

    const changes = {};

    if (form.matricula !== originalForm?.matricula) {
      changes.matricula = form.matricula.toUpperCase();
    }

    if (form.marca !== originalForm?.marca) {
      changes.marca = form.marca;
    }

    if (form.modelo !== originalForm?.modelo) {
      changes.modelo = form.modelo;
    }

    if (String(form.ano_compra) !== String(originalForm?.ano_compra)) {
      changes.ano_compra = parseInt(form.ano_compra, 10);
    }

    if (String(form.consumo_medio) !== String(originalForm?.consumo_medio)) {
      changes.consumo_medio = parseFloat(form.consumo_medio);
    }

    if (form.tipo_motor !== originalForm?.tipo_motor) {
      changes.tipo_motor = form.tipo_motor;
    }

    if (
      !confortoBloqueado &&
      form.nivel_conforto !== originalForm?.nivel_conforto
    ) {
      changes.nivel_conforto = form.nivel_conforto;
    }

    if (form.observacoes !== originalForm?.observacoes) {
      changes.observacoes = form.observacoes;
    }

    if (Object.keys(changes).length === 0) {
      setApiError("Não existem alterações para guardar.");
      setSubmitting(false);
      return;
    }

    try {
      await taxiService.update(id, changes);
      alert("Táxi atualizado com sucesso!");
      navigate("/gestor/taxis");
    } catch (err) {
      setApiError(err.message ?? "Erro ao atualizar táxi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.root}>
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
    <div className={styles.root}>
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
            {errors.consumo_medio && (
              <span className={styles.fieldError}>{errors.consumo_medio}</span>
            )}
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
            <select
              className={styles.select}
              value={form.tipo_motor}
              onChange={(e) => set("tipo_motor", e.target.value)}
            >
              {MOTOR_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Nível de conforto *</label>
            <select
              className={styles.select}
              value={form.nivel_conforto}
              onChange={(e) => set("nivel_conforto", e.target.value)}
              disabled={confortoBloqueado}
            >
              {COMFORT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {confortoBloqueado && (
              <span className={styles.fieldError}>
                O nível de conforto não pode ser alterado porque este táxi já fez viagens com clientes.
              </span>
            )}
            {errors.nivel_conforto && (
              <span className={styles.fieldError}>{errors.nivel_conforto}</span>
            )}
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