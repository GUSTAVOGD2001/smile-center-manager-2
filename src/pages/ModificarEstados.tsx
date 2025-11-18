import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, DollarSign, Wallet, FileText, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { buildReciboUrl } from '@/lib/urls';

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

const fmtFecha = (v?: string | number | Date) =>
  v
    ? new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(v))
    : '';

const ModificarEstados = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dateTo, setDateTo] = useState<Date>();
  const [searchName, setSearchName] = useState('');
  const [filteredOrders, setFilteredOrders] = useState<OrderRow[]>([]);
  const [editingACuenta, setEditingACuenta] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, dateFrom, dateTo, searchName]);

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

    if (searchName) {
      filtered = filtered.filter(order => {
        const nombre = order['Nombre']?.toLowerCase() || '';
        const apellido = order['Apellido']?.toLowerCase() || '';
        const searchLower = searchName.toLowerCase();
        return nombre.includes(searchLower) || apellido.includes(searchLower);
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
        newState: nuevoEstado,
      };

      console.log('📝 UPDATE Request Body:', JSON.stringify(requestBody));

      const response = await fetch(POST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📝 UPDATE Response Status:', response.status, response.statusText);

      if (!response.ok) {
        const isLikelyCORS = !response.headers.get('content-type');
        if (isLikelyCORS) {
          console.warn('⚠️ CORS: no hay headers. Asumimos éxito si status = 0 o 200–299.');
          if (response.status === 0 || (response.status >= 200 && response.status < 300)) {
            await fetchOrders();
            toast.success('Estado actualizado correctamente');
            return;
          }
        }
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('📝 UPDATE Response Text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.warn('⚠️ No se pudo parsear como JSON. Asumiendo éxito.');
        await fetchOrders();
        toast.success('Estado actualizado correctamente');
        return;
      }

      console.log('📝 UPDATE Response Data:', data);
      
      await fetchOrders();
      toast.success('Estado actualizado correctamente');
    } catch (error: any) {
      console.error('❌ ERROR:', error);
      toast.error(error.message || 'Error al actualizar el estado');
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const updateACuenta = async (order: OrderRow, nuevoValor: string) => {
    const orderId = order['ID Orden'];
    const valorNumerico = Number(nuevoValor);
    
    if (isNaN(valorNumerico) || valorNumerico < 0) {
      toast.error('Por favor ingrese un valor numérico válido');
      return;
    }

    setUpdatingIds(prev => new Set(prev).add(orderId));

    try {
      const POST_URL = 'https://script.google.com/macros/s/AKfycby0z-tq623Nxh9jTK7g9c5jXF8VQY_iqrL5IYs4J-7OGg3tUyfO7-5RZVFAtbh9KlhJMw/exec';
      
      const requestBody = {
        token: 'Tamarindo123456',
        action: 'update',
        keyColumn: 'ID Orden',
        keyValue: orderId,
        updates: [
          { column: 'A Cuenta', value: valorNumerico }
        ],
        debug: false
      };

      const response = await fetch(POST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      await fetchOrders();
      setEditingACuenta(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
      toast.success('A cuenta actualizado correctamente');
    } catch (error: any) {
      console.error('Error al actualizar A cuenta:', error);
      toast.error(error.message || 'Error al actualizar A cuenta');
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

      {/* Filtros */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              />
            </div>
            <div className="flex gap-4 flex-wrap">
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
                  const now = new Date();
                  setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1));
                  setDateTo(undefined);
                  setSearchName('');
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas de suma */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card hover-lift border-[rgba(255,255,255,0.1)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Costos</CardTitle>
            <DollarSign className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${filteredOrders.reduce((sum, order) => sum + (parseFloat(order['Costo'] || '0')), 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card hover-lift border-[rgba(255,255,255,0.1)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total A Cuenta</CardTitle>
            <Wallet className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${filteredOrders.reduce((sum, order) => sum + (parseFloat(order['A Cuenta'] || '0')), 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card hover-lift border-[rgba(255,255,255,0.1)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Piezas Dentales</CardTitle>
            <Layers className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {filteredOrders.reduce((sum, order) => sum + (parseInt(order['Piezas Dentales'] || '0')), 0)}
            </div>
          </CardContent>
        </Card>
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
                  <th className="text-left p-3 font-semibold">Fecha de Registro</th>
                  <th className="text-left p-3 font-semibold">Nombre</th>
                  <th className="text-left p-3 font-semibold">Costo</th>
                  <th className="text-left p-3 font-semibold">A Cuenta</th>
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
                      <td className="p-3">{fmtFecha(order.Timestamp)}</td>
                      <td className="p-3">{order['Nombre']} {order['Apellido']}</td>
                      <td className="p-3">${order['Costo'] || '0'}</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={(editingACuenta[orderId] ?? order['A Cuenta']) || '0'}
                          onChange={(e) => setEditingACuenta(prev => ({ ...prev, [orderId]: e.target.value }))}
                          onBlur={() => {
                            const newValue = editingACuenta[orderId];
                            if (newValue !== undefined && newValue !== order['A Cuenta']) {
                              updateACuenta(order, newValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newValue = editingACuenta[orderId];
                              if (newValue !== undefined && newValue !== order['A Cuenta']) {
                                updateACuenta(order, newValue);
                              }
                            }
                          }}
                          disabled={isUpdating}
                          className="w-28 bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                        />
                      </td>
                      <td className="p-3">
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                          {order.Estado}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const receiptUrl = buildReciboUrl(orderId, 'a4');
                              window.open(receiptUrl, '_blank');
                            }}
                            className="gap-2"
                          >
                            <FileText size={16} />
                            Ver Recibo
                          </Button>
                        </div>
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
