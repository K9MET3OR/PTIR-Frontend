import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motoristaService } from "../../../services/motoristaService";
import { taxiService } from "../../../services/taxiService";
import { api } from "../../../services/api";
import styles from "../../../styles/Form.module.css";

function validateNIF(nif) {
  return /^[123456789]\d{8}$/.test(nif);
}

function validateCarta(carta) {
  return carta.trim().length > 0;
}

export default function MotoristaRegisterPage() {
  const navigate = useNavigate();
  const [taxis, setTaxis] = useState([]);

  const [form, setForm] = useState({
    nome: "",
    nif: "",
    data_nascimento: "",
    genero: "M",
    email: "",
    telefone: "",
    n_carta: "",
    validade_carta: "",
    codigo_postal: "",
    localidade: "",
    taxi_id: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [localidadeLoading, setLocalidadeLoading] = useState(false);

  useEffect(() => {
    taxiService.list()
      .then((response) => setTaxis(Array.isArray(response?.data) ? response.data : []))
      .catch(() => setTaxis([]));
  }, []);

  async function fetchLocalidade(codigoPostal) {
    setLocalidadeLoading(true);
    try {
      const data = await api.get(`/driver/localidade/${codigoPostal}`);
      setForm((f) => ({ ...f, localidade: data.localidade || "" }));
      setErrors((e) => ({ ...e, codigo_postal: "" }));
    } catch (err) {
      setErrors((e) => ({
        ...e,
        codigo_postal: err.message || "Código postal não encontrado.",
      }));
      setForm((f) => ({ ...f, localidade: "" }));
    } finally {
      setLocalidadeLoading(false);
    }
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));

    if (field === "codigo_postal") {
      if (/^\d{4}-\d{3}$/.test(value)) {
        fetchLocalidade(value);
      } else {
        setForm((f) => ({ ...f, localidade: "" }));
      }
    }
  }

  function validate() {
    const e = {};

    if (!form.nome.trim()) e.nome = "Nome obrigatório.";
    if (!validateNIF(form.nif)) e.nif = "NIF inválido (9 dígitos positivos).";

    if (!form.data_nascimento) {
      e.data_nascimento = "Data de nascimento obrigatória.";
    } else {
      const birthDate = new Date(form.data_nascimento);
      const today = new Date();
      let idade = today.getFullYear() - birthDate.getFullYear();

      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        idade--;
      }

      if (idade < 18) e.data_nascimento = "O motorista deve ter pelo menos 18 anos.";
    }

    if (!form.email.includes("@")) e.email = "Email inválido.";
    if (!/^\d{9}$/.test(form.telefone)) e.telefone = "Telefone inválido (9 dígitos).";
    if (!validateCarta(form.n_carta)) e.n_carta = "Número de carta de condução obrigatório.";

    if (!form.validade_carta) {
      e.validade_carta = "Validade da carta obrigatória.";
    } else if (new Date(form.validade_carta) < new Date()) {
      e.validade_carta = "A carta de condução está expirada.";
    }

    if (form.codigo_postal && !/^\d{4}-\d{3}$/.test(form.codigo_postal)) {
      e.codigo_postal = "Código postal inválido. Use XXXX-XXX.";
    }

    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      setApiError("");

      await motoristaService.create({
        ...form,
        role: "motorista",
      });

      navigate("/gestor/motoristas");
    } catch (err) {
      setApiError(err.message || "Erro ao registar motorista.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
      <button className={styles.backBtn} onClick={() => navigate("/gestor/motoristas")}>
        ← Voltar à lista
      </button>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Registar motorista</h1>
        <p className={styles.pageSubtitle}>Preenche os dados do novo motorista</p>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
        <div className={styles.grid}>

          <div className={styles.field}>
            <label className={styles.label}>Nome completo *</label>
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
            <label>Género *</label>
            <select
              className={styles.select}
              value={form.genero}
              onChange={(e) => set("genero", e.target.value)}
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
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
              placeholder="A-12345-PT"
              value={form.n_carta}
              onChange={(e) => set("n_carta", e.target.value.toUpperCase())}
              style={{ textTransform: "uppercase" }}
            />
            {errors.n_carta && <span className={styles.fieldError}>{errors.n_carta}</span>}
          </div>

          <div className={styles.field}>
            <label>Validade da carta *</label>
            <input
              className={styles.input}
              type="date"
              value={form.validade_carta}
              onChange={(e) => set("validade_carta", e.target.value)}
            />
            {errors.validade_carta && <span className={styles.fieldError}>{errors.validade_carta}</span>}
          </div>

          <div className={styles.field}>
            <label>Código postal (opcional)</label>
            <input
              className={styles.input}
              placeholder="1234-567"
              maxLength="8"
              value={form.codigo_postal}
              onChange={(e) => set("codigo_postal", e.target.value)}
            />
            {localidadeLoading && <small style={{ color: "#666" }}>A carregar localidade…</small>}
            {errors.codigo_postal && <span className={styles.fieldError}>{errors.codigo_postal}</span>}
          </div>

          <div className={styles.field}>
            <label>Localidade (preenchida automaticamente)</label>
            <input
              className={styles.input}
              placeholder="Será preenchida automaticamente"
              value={form.localidade}
              readOnly
              disabled={localidadeLoading}
              style={{ backgroundColor: form.localidade ? "#fff" : "#f5f5f5" }}
            />
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label>Táxi atribuído (opcional)</label>
            <select
              className={styles.select}
              value={form.taxi_id}
              onChange={(e) => set("taxi_id", e.target.value)}
            >
              <option value="">— selecionar —</option>
              {taxis.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.matricula} — {t.marca} {t.modelo} {t.ano_compra}
                </option>
              ))}
            </select>
          </div>
        </div>

        {apiError && <p className={styles.apiError}>{apiError}</p>}

        <div className={styles.actions}>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "A registar…" : "Registar motorista →"}
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