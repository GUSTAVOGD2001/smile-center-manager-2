import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OrderRow {
  'ID Orden': string;
  Timestamp: string;
  Estado: string;
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
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [filteredOrders, setFilteredOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, dateFrom, dateTo]);

  const filterOrders = () => {
    let filtered = [...orders];

    if (dateFrom) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.Timestamp);
        return orderDate >= dateFrom;
      });
    }

    if (dateTo) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.Timestamp);
        return orderDate <= dateTo;
      });
    }

    setFilteredOrders(filtered);
  };

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

    console.log('📝 UPDATE: Iniciando actualización...');
    console.log('📝 UPDATE Order ID:', orderId);
    console.log('📝 UPDATE Nuevo Estado:', nuevoEstado);

    try {
      const POST_URL = 'https://script.google.com/macros/s/AKfycby0z-tq623Nxh9jTK7g9c5jXF8VQY_iqrL5IYs4J-7OGg3tUyfO7-5RZVFAtbh9KlhJMw/exec';
      
      const requestBody = {
        token: 'Tamarindo123456',
        action: 'update',
        keyColumn: 'ID Orden',
        keyValue: orderId,
        newStatus: nuevoEstado,
      };

      const bodyText = JSON.stringify(requestBody);

      console.log('📝 UPDATE Request body:', requestBody);
      console.log('📝 UPDATE Body (raw text):', bodyText);

      const response = await fetch(POST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: bodyText,
      });

      console.log('📝 UPDATE Response status:', response.status);
      console.log('📝 UPDATE Response ok:', response.ok);

      const result = await response.json();
      console.log('📝 UPDATE Result:', result);

      if (result.ok) {
        toast.success('Estado actualizado correctamente');
        // Update local state
        setOrders(prevOrders =>
          prevOrders.map(o =>
            o['ID Orden'] === orderId ? { ...o, Estado: nuevoEstado } : o
          )
        );
      } else {
        console.error('📝 UPDATE Error en resultado:', result);
        toast.error(`Error: ${result.message || 'Error al actualizar el estado'}`);
      }
    } catch (error) {
      console.error('❌ UPDATE Error crítico:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        toast.error('Error CORS: El Google Script debe permitir requests desde este origen');
        console.error('❌ CORS Error: Asegúrate de que el Google Apps Script esté desplegado como "Anyone" y acepte requests POST');
      } else {
        toast.error('Error de conexión al actualizar el estado');
      }
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
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : <span>Fecha desde</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : <span>Fecha hasta</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)]">
                  <th className="text-left p-3 font-semibold">ID Orden</th>
                  <th className="text-left p-3 font-semibold">Timestamp</th>
                  <th className="text-left p-3 font-semibold">Estado</th>
                  <th className="text-left p-3 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => {
                  const orderId = order['ID Orden'];
                  const isUpdating = updatingIds.has(orderId);

                  return (
                    <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                      <td className="p-3">{orderId}</td>
                      <td className="p-3">{new Date(order.Timestamp).toLocaleString('es-ES')}</td>
                      <td className="p-3">
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                          {order.Estado}
                        </span>
                      </td>
                      <td className="p-3">
                        <Select
                          value={order.Estado}
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
