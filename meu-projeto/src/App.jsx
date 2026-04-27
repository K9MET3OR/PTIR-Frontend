import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./routes/PrivateRoute";

import LoginPage           from "./pages/auth/LoginPage";
import SignupPage          from "./pages/auth/SignupPage";
import DashboardLayout     from "./layouts/DashboardLayout";
import GestorDashboard     from "./pages/gestor/GestorDashboard";
import TaxiListPage        from "./pages/gestor/taxis/TaxiListPage";
import TaxiRegisterPage    from "./pages/gestor/taxis/TaxiRegisterPage";
import TaxiEditPage        from "./pages/gestor/taxis/TaxiEditPage";
import MotoristaListPage   from "./pages/gestor/motoristas/MotoristaListPage";
import MotoristaRegisterPage from "./pages/gestor/motoristas/MotoristaRegisterPage";
import MotoristaEditPage from "./pages/gestor/motoristas/MotoristaEditPage";

import MapaPedidosPage    from "./pages/motorista/MapaPedidosPage";
import PedidosMotoristaPage from "./pages/motorista/PedidosMotoristaPage";
import IniciarTurnoPage   from "./pages/motorista/IniciarTurnoPage";
import RegistarViagemPage from "./pages/motorista/RegistarViagemPage";
import PedirTaxiPage      from "./pages/cliente/PedirTaxiPage";
import ClientePagamentoPage from "./pages/cliente/ClientePagamentoPage";


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Gestor — requer role admin (mantendo compatibilidade com gestor) */}
          <Route element={<PrivateRoute allowedRoles={["admin", "gestor"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/gestor"                         element={<GestorDashboard />} />
              <Route path="/gestor/taxis"                   element={<TaxiListPage />} />
              <Route path="/gestor/taxis/novo"              element={<TaxiRegisterPage />} />
              <Route path="/gestor/taxis/:id/editar"        element={<TaxiEditPage />} />
              <Route path="/gestor/motoristas"              element={<MotoristaListPage />} />
              <Route path="/gestor/motoristas/novo"         element={<MotoristaRegisterPage />} />
              <Route path="/gestor/motoristas/:id/editar" element={<MotoristaEditPage />} />
              
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={["motorista"]} />}>
            <Route path="/motorista" element={<IniciarTurnoPage />} />
            <Route path="/motorista/turno" element={<IniciarTurnoPage />} />
            <Route path="/motorista/mapa" element={<MapaPedidosPage />} />
            <Route path="/motorista/pedidos" element={<PedidosMotoristaPage />} />
            <Route path="/motorista/viagem" element={<RegistarViagemPage />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={["cliente"]} />}>
            <Route path="/cliente/pedir" element={<PedirTaxiPage />} />
            <Route path="/cliente/pagamento" element={<ClientePagamentoPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}