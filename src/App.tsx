import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/DashboardLayout";
import Home from "./pages/Home";
import Calendario from "./pages/Calendario";
import ModificarEstados from "./pages/ModificarEstados";
import Configuracion from "./pages/Configuracion";
import Inventario from "./pages/Inventario";
import Finanzas from "./pages/Finanzas";
import Ingresos from "./pages/Ingresos";
import HomeUsuario from "./pages/HomeUsuario";
import HomeSecretaria from "./pages/HomeSecretaria";
import HomeDiseñadores from "./pages/HomeDiseñadores";
import Evidencias from "./pages/Evidencias";
import Pendientes from "./pages/Pendientes";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, currentUser } = useAuth();
  
  if (!isAdmin()) {
    if (currentUser?.role === 'auxiliar') {
      return <Navigate to="/home-auxiliar" replace />;
    }
    return <Navigate to="/home-usuario" replace />;
  }
  
  return <>{children}</>;
};

const UserRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, currentUser } = useAuth();
  
  if (isAdmin()) {
    return <Navigate to="/" replace />;
  }
  
  if (currentUser?.role === 'auxiliar') {
    return <Navigate to="/home-auxiliar" replace />;
  }
  
  return <>{children}</>;
};

const AuxiliarRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isAuxiliar } = useAuth();
  
  if (isAdmin()) {
    return <Navigate to="/" replace />;
  }
  
  if (!isAuxiliar()) {
    return <Navigate to="/home-usuario" replace />;
  }
  
  return <>{children}</>;
};

const DiseñadorRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isDiseñador } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isDiseñador()) return <Navigate to="/home-usuario" replace />;
  return <>{children}</>;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <DashboardLayout>
                      <Home />
                    </DashboardLayout>
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/calendario"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <DashboardLayout>
                      <Calendario />
                    </DashboardLayout>
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/modificar-estados"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <DashboardLayout>
                      <ModificarEstados />
                    </DashboardLayout>
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/configuracion"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <DashboardLayout>
                      <Configuracion />
                    </DashboardLayout>
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/inventario"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <Inventario />
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/finanzas"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <DashboardLayout>
                      <Finanzas />
                    </DashboardLayout>
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/ingresos"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <DashboardLayout>
                      <Ingresos />
                    </DashboardLayout>
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/home-usuario"
              element={
                <AuthGuard>
                  <UserRoute>
                    <DashboardLayout>
                      <HomeUsuario />
                    </DashboardLayout>
                  </UserRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/home-auxiliar"
              element={
                <AuthGuard>
                  <AuxiliarRoute>
                    <DashboardLayout>
                      <HomeSecretaria />
                    </DashboardLayout>
                  </AuxiliarRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/home-diseñadores"
              element={
                <AuthGuard>
                  <DiseñadorRoute>
                    <DashboardLayout>
                      <HomeDiseñadores />
                    </DashboardLayout>
                  </DiseñadorRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/evidencias"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <DashboardLayout>
                      <Evidencias />
                    </DashboardLayout>
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pendientes"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <DashboardLayout>
                      <Pendientes />
                    </DashboardLayout>
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
