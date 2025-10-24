import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface PasswordChangeDialogProps {
  open: boolean;
  onPasswordChange: (newPassword: string) => void;
}

const PasswordChangeDialog = ({ open, onPasswordChange }: PasswordChangeDialogProps) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    onPasswordChange(newPassword);
    toast.success('Contraseña actualizada correctamente');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="glass-card" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Cambio de Contraseña Requerido</DialogTitle>
          <DialogDescription>
            Por seguridad, debe cambiar su contraseña temporal antes de continuar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita la contraseña"
              className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Cambiar Contraseña
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordChangeDialog;
