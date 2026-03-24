import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motoristaService } from "../../../services/motoristaService";
import { taxiService } from "../../../services/taxiService";
import styles from "../../../styles/Form.module.css";

function validateNIF(nif) {
  // NIF português: 9 dígitos, começa por 1,2,3,5,6,7,8,9
  return /^[123456789]\d{8}$/.test(nif);
}

function validateCarta(carta) {
  // Formato: A-12345-PT (letra, hífen, 5 dígitos, hífen, 2 letras)
  return /^[A-Z]-\d{5}-[A-Z]{2}$/.test(carta.toUpperCase());
}

export default function MotoristaRegisterPage() {
  const navigate = useNavigate();
  const [taxis, setTaxis] = useState([]);

  const [form, setForm] = useState({
    nome:             "",
    nif:              "",
    data_nascimento:  "",
    genero:           "M",
    email:            "",
    telefone:         "",
    n_carta:          "",
    validade_carta:   "",
    taxi_id:          "",
  });

  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState("");

  // Carrega lista de táxis disponíveis para atribuição
  useEffect(() => {
    taxiService.list()
      .then(setTaxis)
      .catch(() => {}); // silencia — atribuição é opcional
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate() {
    const e = {};
    if (!form.nome.trim())         e.nome = "Nome obrigatório.";
    if (!validateNIF(form.nif))    e.nif  = "NIF inválido (9 dígitos).";
    if (!form.data_nascimento)     e.data_nascimento = "Data de nascimento obrigatória.";
    else {
      const idade = new Date().getFullYear() - new Date(form.data_nascimento).getFullYear();
      if (idade < 18) e.data_nascimento = "O motorista deve ter pelo menos 18 anos.";
    }
    if (!form.email.includes("@")) e.email = "Email inválido.";
    if (!form.telefone.match(/^\d{9}$/)) e.telefone = "Telefone inválido (9 dígitos).";
    if (!validateCarta(form.n_carta))    e.n_carta  = "Formato inválido. Ex: A-12345-PT";
    if (!form.validade_carta)            e.validade_carta = "Validade da carta obrigatória.";
    else if (new Date(form.validade_carta) < new Date())
      e.validade_carta = "A carta de condução está expirada.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // ... validações ...

    try {
      setLoading(true);
      // 1. O Gestor cria o motorista no Firebase (necessita de lógica extra ou Cloud Function)
      // Para simplificar o teu rascunho, vamos assumir que o Django trata disso:
      await motoristaService.create({
        ...form,
        role: 'motorista'
      });
      
      navigate("/gestor/motoristas");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
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
            <label>Nome completo *</label>
            <input
              placeholder="João Silva"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
            />
            {errors.nome && <span className={styles.fieldError}>{errors.nome}</span>}
          </div>

          <div className={styles.field}>
            <label>NIF *</label>
            <input
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
              type="date"
              value={form.data_nascimento}
              onChange={(e) => set("data_nascimento", e.target.value)}
            />
            {errors.data_nascimento && <span className={styles.fieldError}>{errors.data_nascimento}</span>}
          </div>

          <div className={styles.field}>
            <label>Género</label>
            <select value={form.genero} onChange={(e) => set("genero", e.target.value)}>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="O">Outro</option>
            </select>
          </div>

          <div className={styles.field}>
            <label>Email *</label>
            <input
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
              placeholder="A-12345-PT"
              value={form.n_carta}
              onChange={(e) => set("n_carta", e.target.value)}
              style={{ textTransform: "uppercase" }}
            />
            {errors.n_carta && <span className={styles.fieldError}>{errors.n_carta}</span>}
          </div>

          <div className={styles.field}>
            <label>Validade da carta *</label>
            <input
              type="date"
              value={form.validade_carta}
              onChange={(e) => set("validade_carta", e.target.value)}
            />
            {errors.validade_carta && <span className={styles.fieldError}>{errors.validade_carta}</span>}
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label>Táxi atribuído (opcional)</label>
            <select value={form.taxi_id} onChange={(e) => set("taxi_id", e.target.value)}>
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