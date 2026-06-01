import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./SignupPage.module.css";

const ROLES = [
  { id: "admin", label: "Manager", icon: "🏢" },
  { id: "motorista", label: "Driver", icon: "🚗" },
  { id: "cliente", label: "Client", icon: "👤" },
];

// Função para validar NIF simples (9 dígitos positivos)
function validarNIF(nif) {
  nif = String(nif).replace(/\s/g, "");

  if (!/^\d{9}$/.test(nif)) {
    return false;
  }

  return true;
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

export default function SignupPage() {
  const { signup } = useAuth();
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

  // Campos específicos para cliente/motorista
  const [nif, setNif] = useState("");
  const [genero, setGenero] = useState("");

  // Campos específicos para motorista
  const [nCarta, setNCarta] = useState("");
  const [dataNasc, setDataNasc] = useState("");
  const [validadeCarta, setValidadeCarta] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [telefone, setTelefone] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username || !name || !email || !password) {
      setError("Todos os campos são obrigatórios.");
      return;
    }

    if (password !== confirmPass) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("Palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    const hasDigits = /\d/.test(password);
    const hasLetters = /[a-zA-Z]/.test(password);

    if (!hasDigits || !hasLetters) {
      setError("Palavra-passe deve conter dígitos e letras.");
      return;
    }

    if ((selectedRole === "cliente" || selectedRole === "motorista") && !nif) {
      setError("NIF é obrigatório.");
      return;
    }

    if (nif && !validarNIF(nif)) {
      setError("NIF inválido. Verifique o número.");
      return;
    }

    if ((selectedRole === "cliente" || selectedRole === "motorista") && !genero) {
      setError("Género é obrigatório.");
      return;
    }

    if (selectedRole === "motorista") {
      if (!nCarta || !dataNasc || !telefone || !codigoPostal || !validadeCarta) {
        setError("Todos os campos são obrigatórios para motorista.");
        return;
      }

      if (nCarta.trim().length < 5) {
        setError("Número de carta deve ter pelo menos 5 caracteres.");
        return;
      }

      if (!/^\d{9}$/.test(telefone)) {
        setError("Telefone inválido. Deve ter 9 dígitos.");
        return;
      }

      if (!/^\d{4}-\d{3}$/.test(codigoPostal)) {
        setError("Código postal deve ter formato XXXX-XXX.");
        return;
      }

      const idade = calcularIdade(dataNasc);

      if (idade === null) {
        setError("Data de nascimento inválida.");
        return;
      }

      if (idade < 18) {
        setError("Deve ter pelo menos 18 anos.");
        return;
      }

      const erroValidadeCarta = validarValidadeCarta(validadeCarta);

      if (erroValidadeCarta) {
        setError(erroValidadeCarta);
        return;
      }
    }

    setLoading(true);

    try {
      let signupData = {
        email,
        password,
        username,
        name,
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
          n_carta: nCarta.trim().toUpperCase(),
          data_nascimento: dataNasc,
          validade_carta: validadeCarta,
          codigo_postal: codigoPostal,
          telefone,
        };
      }

      await signup(signupData);

      alert("Registo realizado com sucesso!");

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

      setError(messages[err.code] ?? err.message ?? "Erro ao registar. Tenta novamente.");
    } finally {
      setLoading(false);
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
              onChange={(e) => setUsername(e.target.value)}
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
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
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
              onChange={(e) => setConfirmPass(e.target.value)}
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
                placeholder="123456789"
                value={nif}
                maxLength={9}
                onChange={(e) => setNif(e.target.value.replace(/\D/g, ""))}
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
                onChange={(e) => setGenero(e.target.value)}
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
                  onChange={(e) => setDataNasc(e.target.value)}
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
                  onChange={(e) => setNCarta(e.target.value.toUpperCase())}
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
                  onChange={(e) => setValidadeCarta(e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="telefone">Telefone</label>
                <input
                  id="telefone"
                  type="tel"
                  placeholder="912345678"
                  value={telefone}
                  maxLength={9}
                  onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="codigoPostal">Código Postal</label>
                <input
                  id="codigoPostal"
                  type="text"
                  placeholder="1000-001"
                  value={codigoPostal}
                  maxLength={8}
                  onChange={(e) => setCodigoPostal(formatarCodigoPostal(e.target.value))}
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