import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./routes/PrivateRoute";

import LoginPage           from "./pages/auth/LoginPage";
import DashboardLayout     from "./layouts/DashboardLayout";
import GestorDashboard     from "./pages/gestor/GestorDashboard";
import TaxiListPage        from "./pages/gestor/taxis/TaxiListPage";
import TaxiRegisterPage    from "./pages/gestor/taxis/TaxiRegisterPage";
import MotoristaListPage   from "./pages/gestor/motoristas/MotoristaListPage";
import MotoristaRegisterPage from "./pages/gestor/motoristas/MotoristaRegisterPage";

import MapaPedidosPage    from "./pages/motorista/MapaPedidosPage";
import PedirTaxiPage      from "./pages/cliente/PedirTaxiPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Gestor — requer role "gestor" */}
          <Route element={<PrivateRoute allowedRoles={["gestor"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/gestor"                         element={<GestorDashboard />} />
              <Route path="/gestor/taxis"                   element={<TaxiListPage />} />
              <Route path="/gestor/taxis/novo"              element={<TaxiRegisterPage />} />
              <Route path="/gestor/motoristas"              element={<MotoristaListPage />} />
              <Route path="/gestor/motoristas/novo"         element={<MotoristaRegisterPage />} />
              
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={["motorista"]} />}>
           <Route element={<DashboardLayout />}>
              <Route path="/motorista/mapa" element={<MapaPedidosPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={["cliente"]} />}>
           <Route element={<DashboardLayout />}>
              <Route path="/cliente/pedir" element={<PedirTaxiPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}