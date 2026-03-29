import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Uso:
 *   <PrivateRoute />                    → só exige login
 *   <PrivateRoute allowedRoles={["gestor"]} />   → exige login + role
 */
export default function PrivateRoute({ allowedRoles }) {
  const { user, role } = useAuth();

  // Não está autenticado → vai para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Está autenticado mas a role não é permitida → vai para o seu dashboard
  if (allowedRoles && !allowedRoles.includes(role)) {
    const fallbackByRole = {
      admin: "/gestor",
      gestor: "/gestor",
      motorista: "/motorista/mapa",
      cliente: "/cliente/pedir",
    };
    return <Navigate to={fallbackByRole[role] || "/login"} replace />;
  }

  // Tudo ok → renderiza a rota pedida
  return <Outlet />;
}