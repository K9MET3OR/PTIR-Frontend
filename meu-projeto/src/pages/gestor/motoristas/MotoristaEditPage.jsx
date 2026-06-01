import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motoristaService } from "../../../services/motoristaService";
import styles from "../../../styles/Form.module.css";

const GENERO_TYPES = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
];

const ESTADO_TYPES = ["disponivel", "indisponivel"];

function validateNIF(v) {
  return /^[123456789]\d{8}$/.test(v);
}

function validarValidadeCarta(dataValidade) {
  if (!dataValidade) {
    return "Validade da carta obrigatória.";
  }

  const validade = new Date(dataValidade);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const limiteMaximo = new Date();
  limiteMaximo.setFullYear(limiteMaximo.getFullYear() + 15);
  limiteMaximo.setHours(0, 0, 0, 0);

  if (Number.isNaN(validade.getTime())) {
    return "Data de validade inválida.";
  }

  if (validade < hoje) {
    return "A carta de condução está expirada.";
  }

  if (validade > limiteMaximo) {
    return "A validade da carta não pode ser superior a 15 anos no futuro.";
  }

  return null;
}

function formatCodigoPostal(value) {
  const clean = value.replace(/\D/g, "").slice(0, 7);

  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

export default function MotoristaEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
    nome: "",
    nif: "",
    data_nascimento: "",
    genero: "M",
    email: "",
    telefone: "",
    n_carta: "",
    validade_carta: "",
    localidade: "",
    codigo_postal: "",
    estado: "indisponivel",
  });

  const [originalForm, setOriginalForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [localidadeLoading, setLocalidadeLoading] = useState(false);

  useEffect(() => {
    motoristaService.get(id)
      .then((response) => {
        const motorista = response?.motorista || response;

        const motoristaData = {
          nome: motorista.nome || "",
          nif: motorista.nif || "",
          data_nascimento: motorista.ano_nascimento
            ? `${motorista.ano_nascimento}-01-01`
            : "",
          genero: motorista.genero || "M",
          email: motorista.email || "",
          telefone: motorista.telefone || "",
          n_carta: motorista.n_carta || "",
          validade_carta: motorista.validade_carta || "",
          localidade: motorista.localidade || "",
          codigo_postal: motorista.codigo_postal || "",
          estado: motorista.estado || "indisponivel",
        };

        setForm(motoristaData);
        setOriginalForm(motoristaData);
      })
      .catch(() => setApiError("Não foi possível carregar os dados do motorista."))
      .finally(() => setLoading(false));
  }, [id]);

  async function fetchLocalidade(codigoPostal) {
    setLocalidadeLoading(true);
    try {
      const response = await fetch(`/api/driver/localidade/${codigoPostal}`);
      const data = await response.json();

      if (response.ok) {
        setForm((f) => ({ ...f, localidade: data.localidade || "" }));
        setErrors((e) => ({ ...e, codigo_postal: "" }));
      } else {
        setForm((f) => ({ ...f, localidade: "" }));
        setErrors((e) => ({
          ...e,
          codigo_postal: data.message || "Código postal não encontrado.",
        }));
      }
    } catch {
      setForm((f) => ({ ...f, localidade: "" }));
      setErrors((e) => ({
        ...e,
        codigo_postal: "Erro ao consultar código postal.",
      }));
    } finally {
      setLocalidadeLoading(false);
    }
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));

    if (errors[field]) {
      setErrors((e) => ({ ...e, [field]: "" }));
    }

    if (field === "codigo_postal") {
      if (/^\d{4}-\d{3}$/.test(value)) {
        fetchLocalidade(value);
      } else {
        setForm((f) => ({ ...f, codigo_postal: value, localidade: "" }));
      }
    }
  }

  function validate() {
    const e = {};

    if (form.nome !== originalForm?.nome && !form.nome.trim()) {
      e.nome = "Nome obrigatório.";
    }

    if (form.nif !== originalForm?.nif) {
      if (!form.nif) e.nif = "NIF obrigatório.";
      else if (!validateNIF(form.nif)) e.nif = "NIF inválido (9 dígitos).";
    }

    if (form.data_nascimento !== originalForm?.data_nascimento) {
      if (!form.data_nascimento) {
        e.data_nascimento = "Data de nascimento obrigatória.";
      } else {
        const ano = new Date(form.data_nascimento).getFullYear();
        const idade = new Date().getFullYear() - ano;
        if (idade < 18) e.data_nascimento = "O motorista deve ter pelo menos 18 anos.";
      }
    }

    if (form.email !== originalForm?.email) {
      if (!form.email) e.email = "Email obrigatório.";
      else if (!form.email.includes("@")) e.email = "Email inválido.";
    }

    if (form.telefone !== originalForm?.telefone) {
      if (!form.telefone) e.telefone = "Telefone obrigatório.";
      else if (!/^\d{9}$/.test(form.telefone)) e.telefone = "Telefone inválido (9 dígitos).";
    }

    if (form.n_carta !== originalForm?.n_carta && !form.n_carta.trim()) {
      e.n_carta = "Número de carta obrigatório.";
    }

    if (form.validade_carta !== originalForm?.validade_carta) {
      const erroValidadeCarta = validarValidadeCarta(form.validade_carta);
      if (erroValidadeCarta) {
        e.validade_carta = erroValidadeCarta;
      }
    }

    if (
      form.codigo_postal !== originalForm?.codigo_postal &&
      form.codigo_postal &&
      !/^\d{4}-\d{3}$/.test(form.codigo_postal)
    ) {
      e.codigo_postal = "Código postal inválido. Use XXXX-XXX.";
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

    if (form.nome !== originalForm?.nome) changes.nome = form.nome;
    if (form.nif !== originalForm?.nif) changes.nif = form.nif;
    if (form.data_nascimento !== originalForm?.data_nascimento) changes.data_nascimento = form.data_nascimento;
    if (form.genero !== originalForm?.genero) changes.genero = form.genero;
    if (form.email !== originalForm?.email) changes.email = form.email;
    if (form.telefone !== originalForm?.telefone) changes.telefone = form.telefone;
    if (form.n_carta !== originalForm?.n_carta) changes.n_carta = form.n_carta;
    if (form.validade_carta !== originalForm?.validade_carta) changes.validade_carta = form.validade_carta;
    if (form.codigo_postal !== originalForm?.codigo_postal) changes.codigo_postal = form.codigo_postal;
    if (form.estado !== originalForm?.estado) changes.estado = form.estado;

    try {
      await motoristaService.update(id, changes);
      alert("Motorista atualizado com sucesso!");
      navigate("/gestor/motoristas");
    } catch (err) {
      setApiError(err.message ?? "Erro ao atualizar motorista.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.root}>
        <button className={styles.backBtn} onClick={() => navigate("/gestor/motoristas")}>
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
      <button className={styles.backBtn} onClick={() => navigate("/gestor/motoristas")}>
        ← Voltar à lista
      </button>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Editar motorista</h1>
        <p className={styles.pageSubtitle}>Atualiza os dados do motorista</p>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Nome completo *</label>
            <input
              className={styles.input}
              placeholder="João Silva"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
            />
            {errors.nome && <span className={styles.fieldError}>{errors.nome}</span>}
          </div>

          <div className={styles.field}>
            <label>NIF *</label>
            <input
              className={styles.input}
              placeholder="123456789"
              maxLength={9}
              value={form.nif}
              onChange={(e) => set("nif", e.target.value.replace(/\D/g, ""))}
            />
            {errors.nif && <span className={styles.fieldError}>{errors.nif}</span>}
          </div>

          <div className={styles.field}>
            <label>Data de nascimento *</label>
            <input
              className={styles.input}
              type="date"
              value={form.data_nascimento}
              onChange={(e) => set("data_nascimento", e.target.value)}
            />
            {errors.data_nascimento && <span className={styles.fieldError}>{errors.data_nascimento}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Género *</label>
            <select
              className={styles.select}
              value={form.genero}
              onChange={(e) => set("genero", e.target.value)}
            >
              {GENERO_TYPES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Email *</label>
            <input
              className={styles.input}
              type="email"
              placeholder="joao@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
          </div>

          <div className={styles.field}>
            <label>Telefone *</label>
            <input
              className={styles.input}
              placeholder="912345678"
              maxLength={9}
              value={form.telefone}
              onChange={(e) => set("telefone", e.target.value.replace(/\D/g, ""))}
            />
            {errors.telefone && <span className={styles.fieldError}>{errors.telefone}</span>}
          </div>

          <div className={styles.field}>
            <label>N.º carta de condução *</label>
            <input
              className={styles.input}
              placeholder="A12345PT"
              value={form.n_carta}
              onChange={(e) => set("n_carta", e.target.value.toUpperCase())}
            />
            {errors.n_carta && <span className={styles.fieldError}>{errors.n_carta}</span>}
          </div>

          <div className={styles.field}>
            <label>Validade da carta *</label>
            <input
              className={styles.input}
              type="date"
              value={form.validade_carta}
              min={new Date().toISOString().slice(0, 10)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() + 15))
                .toISOString()
                .slice(0, 10)}
              onChange={(e) => set("validade_carta", e.target.value)}
            />
            {errors.validade_carta && <span className={styles.fieldError}>{errors.validade_carta}</span>}
          </div>

          <div className={styles.field}>
            <label>Código postal</label>
            <input
              className={styles.input}
              placeholder="1000-001"
              maxLength={8}
              value={form.codigo_postal}
              onChange={(e) => set("codigo_postal", formatCodigoPostal(e.target.value))}            />
            {localidadeLoading && <small style={{ color: "#b7a7ff" }}>A carregar localidade…</small>}
            {errors.codigo_postal && <span className={styles.fieldError}>{errors.codigo_postal}</span>}
          </div>

          <div className={styles.field}>
            <label>Localidade</label>
            <input
              className={styles.input}
              placeholder="Será preenchida automaticamente"
              value={form.localidade}
              readOnly
              disabled={localidadeLoading}
            />
          </div>

          <div className={styles.field}>
            <label>Estado</label>
            <select
              className={styles.select}
              value={form.estado}
              onChange={(e) => set("estado", e.target.value)}
            >
              {ESTADO_TYPES.map((estado) => (
                <option key={estado} value={estado}>
                  {estado === "disponivel" ? "Disponível" : "Indisponível"}
                </option>
              ))}
            </select>
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
            onClick={() => navigate("/gestor/motoristas")}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}