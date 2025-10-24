import { Home, Tag, LogOut, Settings, Search } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import smileCenterLogo from '@/assets/smile-center-logo.png';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { logout, isAdmin, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminNavItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/modificar-estados', label: 'Modificar estados', icon: Tag },
    { path: '/configuracion', label: 'Configuración', icon: Settings },
  ];

  const userNavItems = [
    { path: '/home-usuario', label: 'Búsqueda de Órdenes', icon: Search },
  ];

  const navItems = isAdmin() ? adminNavItems : userNavItems;

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
                {currentUser?.username} ({isAdmin() ? 'Administrador' : 'Usuario'})
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
