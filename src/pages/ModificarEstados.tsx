import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface OrderRow {
  'ID Orden': string;
  Timestamp: string;
  U: string;
  [key: string]: string;
}

const ESTADOS = [
  'Recepcion',
  'Area de yeso',
  'Diseño',
  'Area de fresado',
  'Ajuste',
  'Terminado',
  'Listo para recoger',
  'Cancelado',
  'Entregado',
  'Entregado-Pendiente de pago',
];

const ModificarEstados = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const GET_URL = 'https://script.google.com/macros/s/AKfycby0z-tq623Nxh9jTK7g9c5jXF8VQY_iqrL5IYs4J-7OGg3tUyfO7-5RZVFAtbh9KlhJMw/exec?token=Tamarindo123456';
      const response = await fetch(GET_URL);
      const data = await response.json();
      setOrders(data.rows || []);
    } catch (error) {
      toast.error('Error al cargar las órdenes');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateEstado = async (order: OrderRow, nuevoEstado: string) => {
    const orderId = order['ID Orden'];
    setUpdatingIds(prev => new Set(prev).add(orderId));

    try {
      const POST_URL = 'https://script.google.com/macros/s/AKfycby0z-tq623Nxh9jTK7g9c5jXF8VQY_iqrL5IYs4J-7OGg3tUyfO7-5RZVFAtbh9KlhJMw/exec?token=Tamarindo123456';
      
      const response = await fetch(POST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'Tamarindo123456',
          action: 'update',
          keyColumn: 'ID Orden',
          keyValue: orderId,
          newStatus: nuevoEstado,
        }),
      });

      const result = await response.json();

      if (result.ok) {
        toast.success('Estado actualizado correctamente');
        // Update local state
        setOrders(prevOrders =>
          prevOrders.map(o =>
            o['ID Orden'] === orderId ? { ...o, U: nuevoEstado } : o
          )
        );
      } else {
        toast.error('Error al actualizar el estado');
      }
    } catch (error) {
      toast.error('Error de conexión al actualizar el estado');
      console.error(error);
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Modificar Estados</h1>
        <p className="text-muted-foreground">Actualiza el estado de las órdenes</p>
      </div>

      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Gestión de Estados de Órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)]">
                  <th className="text-left p-3 font-semibold">ID Orden</th>
                  <th className="text-left p-3 font-semibold">Timestamp</th>
                  <th className="text-left p-3 font-semibold">Estado (Columna U)</th>
                  <th className="text-left p-3 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => {
                  const orderId = order['ID Orden'];
                  const isUpdating = updatingIds.has(orderId);

                  return (
                    <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                      <td className="p-3">{orderId}</td>
                      <td className="p-3">{new Date(order.Timestamp).toLocaleString('es-ES')}</td>
                      <td className="p-3">
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                          {order.U}
                        </span>
                      </td>
                      <td className="p-3">
                        <Select
                          value={order.U}
                          onValueChange={(value) => updateEstado(order, value)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-[220px] bg-secondary/50 border-[rgba(255,255,255,0.1)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-[rgba(255,255,255,0.1)]">
                            {ESTADOS.map((estado) => (
                              <SelectItem key={estado} value={estado}>
                                {estado}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModificarEstados;
