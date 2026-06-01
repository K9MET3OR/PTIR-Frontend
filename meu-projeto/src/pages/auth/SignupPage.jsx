import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import styles from "./SignupPage.module.css";

const ROLES = [
  { id: "admin", label: "Manager", icon: "🏢" },
  { id: "motorista", label: "Driver", icon: "🚗" },
  { id: "cliente", label: "Client", icon: "👤" },
];

const LIMITES = {
  username: 30,
  name: 100,
  email: 150,
  password: 128,
  nif: 9,
  nCarta: 20,
  telefone: 9,
  codigoPostal: 8,
};

function validarNIF(nif) {
  nif = String(nif).replace(/\s/g, "");

  if (!/^\d{9}$/.test(nif)) {
    return false;
  }

  return true;
}

function limitarTexto(value, max) {
  return String(value || "").slice(0, max);
}

function limparUsername(value) {
  return limitarTexto(
    String(value || "")
      .replace(/\s/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, ""),
    LIMITES.username
  );
}

function limparNome(value) {
  return limitarTexto(
    String(value || "").replace(/\s{2,}/g, " "),
    LIMITES.name
  );
}

function limparEmail(value) {
  return limitarTexto(
    String(value || "")
      .trim()
      .replace(/\s/g, ""),
    LIMITES.email
  );
}

function limparCarta(value) {
  return limitarTexto(
    String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, ""),
    LIMITES.nCarta
  );
}

function formatarCodigoPostal(value) {
  const clean = value.replace(/\D/g, "").slice(0, 7);

  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

function dataHojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function dataMaxValidadeCartaISO() {
  const data = new Date();
  data.setFullYear(data.getFullYear() + 15);
  return data.toISOString().slice(0, 10);
}

function dataMinNascimentoISO() {
  const data = new Date();
  data.setFullYear(data.getFullYear() - 100);
  return data.toISOString().slice(0, 10);
}

function dataMaxNascimentoISO() {
  const data = new Date();
  data.setFullYear(data.getFullYear() - 18);
  return data.toISOString().slice(0, 10);
}

function validarValidadeCarta(dataValidade) {
  if (!dataValidade) {
    return "Validade da carta é obrigatória.";
  }

  const validade = new Date(dataValidade);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const limiteMaximo = new Date();
  limiteMaximo.setFullYear(limiteMaximo.getFullYear() + 15);
  limiteMaximo.setHours(0, 0, 0, 0);

  if (Number.isNaN(validade.getTime())) {
    return "Data de validade da carta inválida.";
  }

  if (validade < hoje) {
    return "A carta de condução está expirada.";
  }

  if (validade > limiteMaximo) {
    return "A validade da carta não pode ser superior a 15 anos no futuro.";
  }

  return null;
}

function calcularIdade(dataNascimento) {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();

  if (Number.isNaN(nascimento.getTime())) {
    return null;
  }

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesDiff = hoje.getMonth() - nascimento.getMonth();

  if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }

  return idade;
}

function validarLimitesTexto({ username, name, email, password, nCarta }) {
  if (username.length > LIMITES.username) {
    return `Username não pode ter mais de ${LIMITES.username} caracteres.`;
  }

  if (name.length > LIMITES.name) {
    return `Nome não pode ter mais de ${LIMITES.name} caracteres.`;
  }

  if (email.length > LIMITES.email) {
    return `Email não pode ter mais de ${LIMITES.email} caracteres.`;
  }

  if (password.length > LIMITES.password) {
    return `Palavra-passe não pode ter mais de ${LIMITES.password} caracteres.`;
  }

  if (nCarta && nCarta.length > LIMITES.nCarta) {
    return `Número da carta não pode ter mais de ${LIMITES.nCarta} caracteres.`;
  }

  return null;
}

export default function SignupPage() {
  const { signup } = useAuth();
  const feedback = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const initialRole = location.state?.selectedRole || "cliente";

  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [nif, setNif] = useState("");
  const [genero, setGenero] = useState("");

  const [nCarta, setNCarta] = useState("");
  const [dataNasc, setDataNasc] = useState("");
  const [validadeCarta, setValidadeCarta] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [telefone, setTelefone] = useState("");

  function showValidationError(message) {
    setError(message);
    feedback.warning(message);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const usernameFinal = username.trim();
    const nameFinal = name.trim();
    const emailFinal = email.trim().toLowerCase();
    const nCartaFinal = nCarta.trim().toUpperCase();

    const erroLimites = validarLimitesTexto({
      username: usernameFinal,
      name: nameFinal,
      email: emailFinal,
      password,
      nCarta: nCartaFinal,
    });

    if (erroLimites) {
      showValidationError(erroLimites);
      return;
    }

    if (!usernameFinal || !nameFinal || !emailFinal || !password) {
      showValidationError("Todos os campos são obrigatórios.");
      return;
    }

    if (usernameFinal.length < 3) {
      showValidationError("Username deve ter pelo menos 3 caracteres.");
      return;
    }

    if (nameFinal.length < 2) {
      showValidationError("Nome deve ter pelo menos 2 caracteres.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFinal)) {
      showValidationError("Email inválido.");
      return;
    }

    if (password !== confirmPass) {
      showValidationError("As palavras-passe não coincidem.");
      return;
    }

    if (password.length < 6) {
      showValidationError("Palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    const hasDigits = /\d/.test(password);
    const hasLetters = /[a-zA-Z]/.test(password);

    if (!hasDigits || !hasLetters) {
      showValidationError("Palavra-passe deve conter dígitos e letras.");
      return;
    }

    if ((selectedRole === "cliente" || selectedRole === "motorista") && !nif) {
      showValidationError("NIF é obrigatório.");
      return;
    }

    if (nif && !validarNIF(nif)) {
      showValidationError("NIF inválido. Verifique o número.");
      return;
    }

    if ((selectedRole === "cliente" || selectedRole === "motorista") && !genero) {
      showValidationError("Género é obrigatório.");
      return;
    }

    if (selectedRole === "motorista") {
      if (!nCartaFinal || !dataNasc || !telefone || !codigoPostal || !validadeCarta) {
        showValidationError("Todos os campos são obrigatórios para motorista.");
        return;
      }

      if (nCartaFinal.length < 5) {
        showValidationError("Número de carta deve ter pelo menos 5 caracteres.");
        return;
      }

      if (!/^[A-Z0-9-]{5,20}$/.test(nCartaFinal)) {
        showValidationError("Número de carta só pode conter letras, números e hífen.");
        return;
      }

      if (!/^\d{9}$/.test(telefone)) {
        showValidationError("Telefone inválido. Deve ter 9 dígitos.");
        return;
      }

      if (!/^\d{4}-\d{3}$/.test(codigoPostal)) {
        showValidationError("Código postal deve ter formato XXXX-XXX.");
        return;
      }

      const idade = calcularIdade(dataNasc);

      if (idade === null) {
        showValidationError("Data de nascimento inválida.");
        return;
      }

      if (idade < 18) {
        showValidationError("Deve ter pelo menos 18 anos.");
        return;
      }

      if (idade > 100) {
        showValidationError("Data de nascimento inválida. Idade máxima permitida: 100 anos.");
        return;
      }

      const erroValidadeCarta = validarValidadeCarta(validadeCarta);

      if (erroValidadeCarta) {
        showValidationError(erroValidadeCarta);
        return;
      }
    }

    setLoading(true);

    try {
      let signupData = {
        email: emailFinal,
        password,
        username: usernameFinal,
        name: nameFinal,
        selectedRole,
      };

      if (selectedRole === "cliente") {
        signupData = {
          ...signupData,
          nif,
          genero,
        };
      }

      if (selectedRole === "motorista") {
        signupData = {
          ...signupData,
          nif,
          genero,
          n_carta: nCartaFinal,
          data_nascimento: dataNasc,
          validade_carta: validadeCarta,
          codigo_postal: codigoPostal,
          telefone,
        };
      }

      await signup(signupData);

      feedback.success("Registo realizado com sucesso!");

      const routeByRole = {
        admin: "/gestor",
        motorista: "/motorista/turno",
        cliente: "/cliente/pedir",
      };

      const routePath = routeByRole[selectedRole] || "/login";
      navigate(routePath, { replace: true });
    } catch (err) {
      const messages = {
        "auth/email-already-in-use": "Este email já tem conta registada.",
        "auth/invalid-credential": "Este email já existe no Firebase e a palavra-passe não coincide.",
        "auth/invalid-email": "Email inválido.",
        "auth/weak-password": "Palavra-passe muito fraca.",
        "auth/network-request-failed": "Sem ligação à internet.",
      };

      const message = messages[err.code] ?? err.message ?? "Erro ao registar. Tenta novamente.";
      setError(message);
      feedback.error(message);
    } finally {
      setLoading(false);
    }
  }

  function clearError() {
    if (error) {
      setError("");
    }
  }

  return (
    <div className={styles.outer}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <div className={styles.logoIcon}>H</div>
          <span className={styles.logoText}>Hermez</span>
        </div>

        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Join us as a new user</p>

        <div className={styles.roleGrid}>
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`${styles.roleBtn} ${
                selectedRole === r.id ? styles.roleBtnActive : ""
              }`}
              onClick={() => {
                setSelectedRole(r.id);
                setError("");
              }}
            >
              <span className={styles.roleIcon}>{r.icon}</span>
              <span className={styles.roleLabel}>{r.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="seu_utilizador"
              value={username}
              maxLength={LIMITES.username}
              onChange={(e) => {
                setUsername(limparUsername(e.target.value));
                clearError();
              }}
              required
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="João Silva"
              value={name}
              maxLength={LIMITES.name}
              onChange={(e) => {
                setName(limparNome(e.target.value));
                clearError();
              }}
              required
              autoComplete="name"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              maxLength={LIMITES.email}
              onChange={(e) => {
                setEmail(limparEmail(e.target.value));
                clearError();
              }}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              maxLength={LIMITES.password}
              onChange={(e) => {
                setPassword(limitarTexto(e.target.value, LIMITES.password));
                clearError();
              }}
              required
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPass">Confirm Password</label>
            <input
              id="confirmPass"
              type="password"
              placeholder="••••••••"
              value={confirmPass}
              maxLength={LIMITES.password}
              onChange={(e) => {
                setConfirmPass(limitarTexto(e.target.value, LIMITES.password));
                clearError();
              }}
              required
              autoComplete="new-password"
            />
          </div>

          {(selectedRole === "cliente" || selectedRole === "motorista") && (
            <div className={styles.field}>
              <label htmlFor="nif">NIF</label>
              <input
                id="nif"
                type="text"
                inputMode="numeric"
                placeholder="123456789"
                value={nif}
                maxLength={LIMITES.nif}
                onChange={(e) => {
                  setNif(e.target.value.replace(/\D/g, "").slice(0, LIMITES.nif));
                  clearError();
                }}
                required
              />
            </div>
          )}

          {(selectedRole === "cliente" || selectedRole === "motorista") && (
            <div className={styles.field}>
              <label htmlFor="genero">Género</label>
              <select
                id="genero"
                value={genero}
                onChange={(e) => {
                  setGenero(e.target.value);
                  clearError();
                }}
                required
              >
                <option value="">Seleciona o género</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
          )}

          {selectedRole === "motorista" && (
            <>
              <div className={styles.field}>
                <label htmlFor="dataNasc">Data de Nascimento</label>
                <input
                  id="dataNasc"
                  type="date"
                  value={dataNasc}
                  min={dataMinNascimentoISO()}
                  max={dataMaxNascimentoISO()}
                  onChange={(e) => {
                    setDataNasc(e.target.value);
                    clearError();
                  }}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="nCarta">Número de Carta de Condução</label>
                <input
                  id="nCarta"
                  type="text"
                  placeholder="AB123456"
                  value={nCarta}
                  maxLength={LIMITES.nCarta}
                  onChange={(e) => {
                    setNCarta(limparCarta(e.target.value));
                    clearError();
                  }}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="validadeCarta">Validade da Carta de Condução</label>
                <input
                  id="validadeCarta"
                  type="date"
                  value={validadeCarta}
                  min={dataHojeISO()}
                  max={dataMaxValidadeCartaISO()}
                  onChange={(e) => {
                    setValidadeCarta(e.target.value);
                    clearError();
                  }}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="telefone">Telefone</label>
                <input
                  id="telefone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="912345678"
                  value={telefone}
                  maxLength={LIMITES.telefone}
                  onChange={(e) => {
                    setTelefone(
                      e.target.value.replace(/\D/g, "").slice(0, LIMITES.telefone)
                    );
                    clearError();
                  }}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="codigoPostal">Código Postal</label>
                <input
                  id="codigoPostal"
                  type="text"
                  inputMode="numeric"
                  placeholder="1000-001"
                  value={codigoPostal}
                  maxLength={LIMITES.codigoPostal}
                  onChange={(e) => {
                    setCodigoPostal(formatarCodigoPostal(e.target.value));
                    clearError();
                  }}
                  required
                />
              </div>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Account →"}
          </button>
        </form>

        <p className={styles.linkRow}>
          Already have an account?{" "}
          <Link
            to="/login"
            state={{ selectedRole }}
            className={styles.link}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}