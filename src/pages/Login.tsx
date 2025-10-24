import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import smileCenterLogo from '@/assets/smile-center-logo.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const success = login(username, password);
      if (success) {
        toast.success('Bienvenido al Dashboard');
        navigate('/', { replace: true });
      } else {
        toast.error('Credenciales incorrectas');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={smileCenterLogo} 
            alt="Smile Center" 
            className="h-24 w-auto mx-auto mb-6 brightness-0 invert"
          />
          <h1 className="text-3xl font-bold mb-2">Smile Center</h1>
          <p className="text-muted-foreground">Ingrese sus credenciales</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              type="text"
              placeholder="SMILEADMIN"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-[hsl(var(--primary-hover))] text-white font-semibold"
            disabled={isLoading}
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Usuario: SMILEADMIN</p>
          <p>Contraseña: Karla12345</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
