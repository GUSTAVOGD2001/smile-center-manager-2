import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { PENDIENTES_API_URL, PENDIENTES_API_KEY } from '@/lib/urls';
import { Plus, Calendar } from 'lucide-react';

interface Pendiente {
  id: string;
  titulo: string;
  nota: string;
  estado: 'Pendiente' | 'Completada';
  fechaRegistro: string;
  fechaRequerida: string;
}

export default function Pendientes() {
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    nota: '',
    fechaRequerida: ''
  });

  useEffect(() => {
    fetchPendientes();
  }, []);

  const fetchPendientes = async () => {
    try {
      setIsLoading(true);
      const url = `${PENDIENTES_API_URL}?apiKey=${PENDIENTES_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'pendientes.list'
        })
      });

      const data = await response.json();
      
      if (data.ok && Array.isArray(data.data)) {
        // Filtrar completadas de días anteriores
        const hoy = new Date().toISOString().split('T')[0];
        const filtradas = data.data.filter((p: Pendiente) => {
          if (p.estado === 'Completada') {
            const fechaRegistro = new Date(p.fechaRegistro).toISOString().split('T')[0];
            return fechaRegistro === hoy;
          }
          return true;
        });

        // Ordenar: pendientes primero, completadas después
        const ordenadas = filtradas.sort((a: Pendiente, b: Pendiente) => {
          if (a.estado === 'Pendiente' && b.estado === 'Completada') return -1;
          if (a.estado === 'Completada' && b.estado === 'Pendiente') return 1;
          return 0;
        });

        setPendientes(ordenadas);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los pendientes',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching pendientes:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar pendientes',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titulo.trim()) {
      toast({
        title: 'Error',
        description: 'El título es obligatorio',
        variant: 'destructive'
      });
      return;
    }

    try {
      const url = `${PENDIENTES_API_URL}?apiKey=${PENDIENTES_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'pendientes.create',
          titulo: formData.titulo,
          nota: formData.nota,
          fechaRequerida: formData.fechaRequerida
        })
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: 'Éxito',
          description: 'Pendiente creado correctamente'
        });
        setIsDialogOpen(false);
        setFormData({ titulo: '', nota: '', fechaRequerida: '' });
        fetchPendientes();
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo crear el pendiente',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating pendiente:', error);
      toast({
        title: 'Error',
        description: 'Error al crear pendiente',
        variant: 'destructive'
      });
    }
  };

  const handleToggleEstado = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'Pendiente' ? 'Completada' : 'Pendiente';

    try {
      const url = `${PENDIENTES_API_URL}?apiKey=${PENDIENTES_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'pendientes.updateEstado',
          id,
          estado: nuevoEstado
        })
      });

      const data = await response.json();

      if (data.ok) {
        fetchPendientes();
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el estado',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating estado:', error);
      toast({
        title: 'Error',
        description: 'Error al actualizar estado',
        variant: 'destructive'
      });
    }
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Pendientes</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Pendiente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Pendiente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Título del pendiente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nota">Nota</Label>
                <Textarea
                  id="nota"
                  value={formData.nota}
                  onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                  placeholder="Nota adicional (opcional)"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaRequerida">Fecha Requerida</Label>
                <Input
                  id="fechaRequerida"
                  type="date"
                  value={formData.fechaRequerida}
                  onChange={(e) => setFormData({ ...formData, fechaRequerida: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Cargando pendientes...</p>
          ) : pendientes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay pendientes</p>
          ) : (
            <div className="space-y-3">
              {pendientes.map((pendiente) => (
                <div
                  key={pendiente.id}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={pendiente.estado === 'Completada'}
                    onCheckedChange={() => handleToggleEstado(pendiente.id, pendiente.estado)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-1">
                    <h3 
                      className={`font-medium ${
                        pendiente.estado === 'Completada' 
                          ? 'line-through text-muted-foreground' 
                          : 'text-foreground'
                      }`}
                    >
                      {pendiente.estado === 'Completada' && '✓ '}
                      {pendiente.titulo}
                    </h3>
                    
                    {pendiente.nota && (
                      <p className="text-sm text-muted-foreground">
                        {pendiente.nota}
                      </p>
                    )}
                    
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {pendiente.fechaRequerida && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatFecha(pendiente.fechaRequerida)}
                        </span>
                      )}
                      <span>ID: {pendiente.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
