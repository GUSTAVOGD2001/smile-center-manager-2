import { useState } from 'react';
import { useAuth, User } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserPlus, Edit, Trash2 } from 'lucide-react';

const Configuracion = () => {
  const { users, addUser, updateUser, deleteUser, currentUser } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<User>({ username: '', password: '', role: 'user' });

  const handleAddUser = () => {
    if (!newUser.username || !newUser.password) {
      toast.error('Complete todos los campos');
      return;
    }
    if (users.find(u => u.username === newUser.username)) {
      toast.error('El usuario ya existe');
      return;
    }
    addUser(newUser);
    toast.success('Usuario agregado correctamente');
    setNewUser({ username: '', password: '', role: 'user' });
    setIsAddDialogOpen(false);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    if (!editingUser.username || !editingUser.password) {
      toast.error('Complete todos los campos');
      return;
    }
    updateUser(editingUser.username, editingUser);
    toast.success('Usuario actualizado correctamente');
    setEditingUser(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteUser = (username: string) => {
    if (username === currentUser?.username) {
      toast.error('No puedes eliminar tu propio usuario');
      return;
    }
    if (username === 'SMILEADMIN') {
      toast.error('No puedes eliminar el usuario administrador principal');
      return;
    }
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      deleteUser(username);
      toast.success('Usuario eliminado correctamente');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser({ ...user });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Configuración</h1>
          <p className="text-muted-foreground">Gestión de usuarios del sistema</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus size={18} />
              Agregar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="new-username">Usuario</Label>
                <Input
                  id="new-username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  placeholder="Ingrese el usuario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  placeholder="Ingrese la contraseña"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Rol</Label>
                <Select value={newUser.role} onValueChange={(value: 'admin' | 'user') => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger className="bg-secondary/50 border-[rgba(255,255,255,0.1)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddUser} className="w-full">
                Agregar Usuario
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)]">
                  <th className="text-left p-3 font-semibold">Usuario</th>
                  <th className="text-left p-3 font-semibold">Rol</th>
                  <th className="text-left p-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.username} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                    <td className="p-3">{user.username}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        user.role === 'admin' 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-secondary/50 text-foreground'
                      }`}>
                        {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(user)}
                          className="gap-2"
                        >
                          <Edit size={16} />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.username)}
                          className="gap-2 hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50"
                        >
                          <Trash2 size={16} />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">Usuario</Label>
                <Input
                  id="edit-username"
                  value={editingUser.username}
                  disabled
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Nueva Contraseña</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editingUser.password}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  placeholder="Ingrese la nueva contraseña"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Rol</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value: 'admin' | 'user') => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger className="bg-secondary/50 border-[rgba(255,255,255,0.1)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateUser} className="w-full">
                Actualizar Usuario
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Configuracion;
