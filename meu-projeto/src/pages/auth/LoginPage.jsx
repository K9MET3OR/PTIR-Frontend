import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { verificarTurnoAtivo } from "../../services/shiftService";
import styles from "./LoginPage.module.css";

const ROLES = [
  { id: "admin",     label: "Manager",     icon: "🏢" },
  { id: "motorista",  label: "Driver",  icon: "🚗" },
  { id: "cliente",    label: "Client",    icon: "👤" },
];

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();

  const [selectedRole, setSelectedRole] = useState("admin");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password, selectedRole);
      console.log('[LOGIN] Resultado do login:', result);
      console.log('[LOGIN] User:', result.user);
      
      // Redireciona para uma rota existente para cada role
      let routePath = "/login"; // default fallback
      
      if (selectedRole === "admin") {
        routePath = "/gestor";
      } else if (selectedRole === "motorista") {
        // Verificar se motorista tem turno ativo no backend
        try {
          console.log('[LOGIN] Verificando turno para motorista ID:', result.user.id);
          const turnoAtivo = await verificarTurnoAtivo(result.user.id);
          console.log('[LOGIN] Resposta verificarTurnoAtivo:', turnoAtivo);
          
          if (turnoAtivo && turnoAtivo.id) {
            // Motorista tem turno ativo, armazena e vai para mapa
            console.log('[LOGIN] Turno ativo encontrado:', turnoAtivo.id);
            localStorage.setItem('turno_id', turnoAtivo.id);
            localStorage.setItem('turno_ativo', 'true');
            routePath = "/motorista/mapa";
          } else {
            // Sem turno ativo, vai para página de iniciar turno
            console.log('[LOGIN] Sem turno ativo, enviando para page de iniciar turno');
            localStorage.removeItem('turno_id');
            localStorage.removeItem('turno_ativo');
            routePath = "/motorista/turno";
          }
        } catch (err) {
          console.error("[LOGIN] Erro ao verificar turno:", err);
          routePath = "/motorista/turno";
        }
      } else if (selectedRole === "cliente") {
        routePath = "/cliente/pedir";
      }
      
      console.log('[LOGIN] Redirecionando para:', routePath);
      navigate(routePath, { replace: true });
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

        {/* Link para signup */}
        <p className={styles.linkRow}>
          Don't have an account?{" "}
          <Link to="/signup" className={styles.link}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}