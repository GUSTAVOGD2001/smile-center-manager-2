import { Home, Tag, LogOut, Settings, Search, Package, ArrowDownCircle, ArrowUpCircle, Calendar, ListTodo } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import smileCenterLogo from '@/assets/smile-center-logo.png';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { logout, isAdmin, isAuxiliar, isDiseñador, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminNavItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/calendario', label: 'Calendario', icon: Calendar },
    { path: '/modificar-estados', label: 'Modificar estados', icon: Tag },
    { path: '/inventario', label: 'Inventario', icon: Package },
    { path: '/finanzas', label: 'Egresos', icon: ArrowDownCircle },
    { path: '/ingresos', label: 'Ingresos', icon: ArrowUpCircle },
    { path: '/evidencias', label: 'Evidencias', icon: Package },
    { path: '/pendientes', label: 'Pendientes', icon: ListTodo },
    { path: '/configuracion', label: 'Configuración', icon: Settings },
  ];

  const userNavItems = [
    { path: '/home-usuario', label: 'Búsqueda de Órdenes', icon: Search },
  ];

  const auxiliarNavItems = [
    { path: '/home-auxiliar', label: 'Búsqueda de Órdenes', icon: Search },
  ];

  const diseñadoresNavItems = [
    { path: '/home-diseñadores', label: 'Inicio', icon: Home },
  ];

  const navItems = isAdmin() 
    ? adminNavItems 
    : isAuxiliar() 
    ? auxiliarNavItems 
    : isDiseñador()
    ? diseñadoresNavItems
    : userNavItems;
  
  const getRoleLabel = () => {
    if (isAdmin()) return 'Administrador';
    if (isAuxiliar()) return 'Auxiliar';
    if (isDiseñador()) return 'Diseñador';
    return 'Usuario';
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <aside className="w-64 glass-card m-4 p-6 flex flex-col">
        <div className="mb-8">
          <img 
            src={smileCenterLogo} 
            alt="Smile Center" 
            className="h-16 w-auto brightness-0 invert"
          />
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary/20 text-primary font-semibold'
                    : 'text-foreground/70 hover:bg-secondary/50 hover:text-foreground'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="glass-card m-4 mb-0 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={smileCenterLogo} 
              alt="Smile Center" 
              className="h-10 w-auto brightness-0 invert"
            />
            <div>
              <h2 className="text-xl font-semibold">Dashboard</h2>
              <p className="text-sm text-muted-foreground">
                {currentUser?.username} ({getRoleLabel()})
              </p>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="gap-2 border-[rgba(255,255,255,0.1)] hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50"
          >
            <LogOut size={18} />
            Cerrar sesión
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
