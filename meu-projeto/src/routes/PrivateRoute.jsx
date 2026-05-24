import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Uso:
 *   <PrivateRoute />                    → só exige login
 *   <PrivateRoute allowedRoles={["gestor"]} />   → exige login + role
 */
export default function PrivateRoute({ allowedRoles }) {
  const { user, role, loading } = useAuth();

  console.log("[PrivateRoute] loading:", loading, "user:", user, "role:", role, "allowedRoles:", allowedRoles);

  // Enquanto carrega, mostra um loading
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontSize: '16px' }}>Carregando autenticação...</div>;
  }

  // Não está autenticado → vai para login
  if (!user) {
    console.log("[PrivateRoute] Utilizador não autenticado, redirecionando para login");
    return <Navigate to="/login" replace />;
  }

  // Está autenticado mas a role não é permitida → vai para o seu dashboard
  if (allowedRoles && !allowedRoles.includes(role)) {
    console.log("[PrivateRoute] Role", role, "não está na lista de allowedRoles:", allowedRoles);
    const fallbackByRole = {
      admin: "/gestor",
      gestor: "/gestor",
      motorista: "/motorista/mapa",
      cliente: "/cliente/pedir",
    };
    return <Navigate to={fallbackByRole[role] || "/login"} replace />;
  }

  console.log("[PrivateRoute] Autorização bem-sucedida, renderizando outlet");
  // Tudo ok → renderiza a rota pedida
  return <Outlet />;
}