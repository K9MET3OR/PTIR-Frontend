import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./LoginPage.module.css";

const ROLES = [
  { id: "gestor",     label: "Manger",     icon: "🏢" },
  { id: "motorista",  label: "Driver",  icon: "🚗" },
  { id: "cliente",    label: "Client",    icon: "👤" },
];

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();

  const [selectedRole, setSelectedRole] = useState("gestor");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password, selectedRole);
      // Redireciona para o dashboard da role escolhida
      navigate(`/${selectedRole}`, { replace: true });
    } catch (err) {
      // Mensagens legíveis em vez dos códigos Firebase
      const messages = {
        "auth/invalid-credential":     "Email ou palavra-passe incorretos.",
        "auth/user-not-found":         "Utilizador não encontrado.",
        "auth/wrong-password":         "Palavra-passe incorreta.",
        "auth/too-many-requests":      "Demasiadas tentativas. Tenta mais tarde.",
        "auth/network-request-failed": "Sem ligação à internet.",
      };
      setError(messages[err.code] ?? "Erro ao entrar. Tenta novamente.");
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

        <h1 className={styles.title}>Sign In</h1>
        <p className={styles.subtitle}>Select your profile to continue</p>

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
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="gestor@empresa.pt"
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
              autoComplete="current-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? "Loading..." : "Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
}