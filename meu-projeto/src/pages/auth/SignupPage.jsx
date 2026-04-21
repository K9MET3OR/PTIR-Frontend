import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./SignupPage.module.css";

const ROLES = [
  { id: "admin",     label: "Manager",     icon: "🏢" },
  { id: "motorista",  label: "Driver",   icon: "🚗" },
  { id: "cliente",    label: "Client",    icon: "👤" },
];

export default function SignupPage() {
  const { signup }   = useAuth();
  const navigate     = useNavigate();

  const [selectedRole, setSelectedRole] = useState("cliente");
  const [username,     setUsername]     = useState("");
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [confirmPass,  setConfirmPass]  = useState("");
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validações básicas
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

    // Validação: senha deve ter dígitos E letras
    const hasDigits = /\d/.test(password);
    const hasLetters = /[a-zA-Z]/.test(password);
    if (!hasDigits || !hasLetters) {
      setError("Palavra-passe deve conter dígitos e letras.");
      return;
    }

    setLoading(true);

    try {
      const result = await signup(email, password, username, name, selectedRole);
      const routeByRole = {
        admin: "/gestor",
        motorista: "/motorista/mapa",
        cliente: "/cliente/pedir",
      };
      // Usar selectedRole já que é o que passamos
      const routePath = routeByRole[selectedRole] || "/login";
      navigate(routePath, { replace: true });
    } catch (err) {
      const messages = {
        "auth/email-already-in-use":    "Este email já tem conta registada.",
        "auth/invalid-credential":      "Este email já existe no Firebase e a palavra-passe não coincide.",
        "auth/invalid-email":           "Email inválido.",
        "auth/weak-password":           "Palavra-passe muito fraca.",
        "auth/network-request-failed":  "Sem ligação à internet.",
      };
      setError(messages[err.code] ?? err.message ?? "Erro ao registar. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.outer}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <div className={styles.logoIcon}>H</div>
          <span className={styles.logoText}>Hermez</span>
        </div>

        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Join us as a new user</p>

        {/* Seleção de role */}
        <div className={styles.roleGrid}>
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`${styles.roleBtn} ${selectedRole === r.id ? styles.roleBtnActive : ""}`}
              onClick={() => setSelectedRole(r.id)}
            >
              <span className={styles.roleIcon}>{r.icon}</span>
              <span className={styles.roleLabel}>{r.label}</span>
            </button>
          ))}
        </div>

        {/* Formulário */}
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

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Account →"}
          </button>
        </form>

        {/* Link para login */}
        <p className={styles.linkRow}>
          Already have an account?{" "}
          <Link to="/login" className={styles.link}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
