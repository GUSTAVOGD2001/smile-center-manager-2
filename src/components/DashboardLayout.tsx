import { Home, Tag, LogOut, Settings, Search, Package } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import smileCenterLogo from '@/assets/smile-center-logo.png';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const AppSidebar = () => {
  const { isAdmin, isSecretaria } = useAuth();
  const { open: sidebarOpen } = useSidebar();

  const adminNavItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/modificar-estados', label: 'Modificar estados', icon: Tag },
    { path: '/inventario', label: 'Inventario', icon: Package },
    { path: '/configuracion', label: 'Configuración', icon: Settings },
  ];

  const userNavItems = [
    { path: '/home-usuario', label: 'Búsqueda de Órdenes', icon: Search },
  ];

  const secretariaNavItems = [
    { path: '/home-secretaria', label: 'Búsqueda de Órdenes', icon: Search },
  ];

  const navItems = isAdmin() ? adminNavItems : isSecretaria() ? secretariaNavItems : userNavItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mb-4">
            <img 
              src={smileCenterLogo} 
              alt="Smile Center" 
              className={`brightness-0 invert transition-all ${sidebarOpen ? 'h-12 w-auto' : 'h-8 w-8'}`}
            />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 transition-all ${
                          isActive
                            ? 'bg-primary/20 text-primary font-semibold'
                            : 'text-foreground/70 hover:bg-secondary/50 hover:text-foreground'
                        }`
                      }
                    >
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const getRoleLabel = () => {
    if (currentUser?.role === 'admin') return 'Administrador';
    if (currentUser?.role === 'secretaria') return 'Secretaria';
    return 'Usuario';
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="glass-card m-4 mb-0 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="mr-2" />
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
    </SidebarProvider>
  );
};

export default DashboardLayout;
