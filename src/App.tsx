import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/DashboardLayout";
import Home from "./pages/Home";
import ModificarEstados from "./pages/ModificarEstados";
import Configuracion from "./pages/Configuracion";
import Inventario from "./pages/Inventario";
import HomeUsuario from "./pages/HomeUsuario";
import HomeSecretaria from "./pages/HomeSecretaria";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, currentUser } = useAuth();
  
  if (!isAdmin()) {
    if (currentUser?.role === 'secretaria') {
      return <Navigate to="/home-secretaria" replace />;
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
  
  if (currentUser?.role === 'secretaria') {
    return <Navigate to="/home-secretaria" replace />;
  }
  
  return <>{children}</>;
};

const SecretariaRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isSecretaria } = useAuth();
  
  if (isAdmin()) {
    return <Navigate to="/" replace />;
  }
  
  if (!isSecretaria()) {
    return <Navigate to="/home-usuario" replace />;
  }
  
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
              path="/home-secretaria"
              element={
                <AuthGuard>
                  <SecretariaRoute>
                    <DashboardLayout>
                      <HomeSecretaria />
                    </DashboardLayout>
                  </SecretariaRoute>
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
