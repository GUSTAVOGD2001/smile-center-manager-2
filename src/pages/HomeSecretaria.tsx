import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Search, Eye, FileText, CalendarIcon, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import PasswordChangeDialog from '@/components/PasswordChangeDialog';
import { actualizarDisenador, obtenerOrdenesPorFecha } from '@/services/api';
import type { OrdenResumen } from '@/services/api';
import type { Orden } from '@/types/orden';
import { buildReciboUrl } from '@/lib/urls';

interface OrderRow {
  'ID Orden': string;
  Timestamp: string;
  Estado: string;
  Diseñadores?: string;
  Repartidores?: string;
  Nombre?: string;
  Apellido?: string;
  'Fecha Requerida'?: string;
  'Tipo de trabajo'?: string;
  Material?: string;
  'Especificación'?: string;
  Recibo?: string;
  ReciboURL?: string;
  Puentes?: string;
  'Color Global'?: string;
  'Dientes seleccionados'?: string;
  [key: string]: string | undefined;
}

const DISEÑADORES = ['ITZEL', 'ALAN', 'Pendiente'];
const REPARTIDORES = ['Victor', 'ALBERTO', 'JORGE', 'Provisional', 'Pick Up', 'Pendiente'];
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

// Note: Replace with environment variables in production
const API_URL = 'https://script.google.com/macros/s/AKfycby0z-tq623Nxh9jTK7g9c5jXF8VQY_iqrL5IYs4J-7OGg3tUyfO7-5RZVFAtbh9KlhJMw/exec';
const API_TOKEN = 'Tamarindo123456';

const asString = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : undefined);

function toDMY(input: string): string {
  if (!input) return '';
  const [y, m, d] = input.split('-');
  const pad = (v: string) => v.padStart(2, '0');
  return `${pad(d)}/${pad(m)}/${y}`;
}

function mapOrdenResumenToOrderRow(item: OrdenResumen): OrderRow {
  const row: OrderRow = {
    'ID Orden': item.id,
    Timestamp: item.timestamp ?? '',
    Estado: item.estado ?? '',
  };

  const designerKeys = ['Diseñadores', 'diseñadores', 'Disenador', 'disenador', 'diseñador'];
  for (const key of designerKeys) {
    const value = asString(item[key]);
    if (value) {
      row.Diseñadores = value;
      break;
    }
  }

  const repartidorKeys = ['Repartidores', 'repartidores', 'Repartidor', 'repartidor'];
  for (const key of repartidorKeys) {
    const value = asString(item[key]);
    if (value) {
      row.Repartidores = value;
      break;
    }
  }

  const extraMappings: [keyof OrderRow, string[]][] = [
    ['Nombre', ['Nombre', 'nombre']],
    ['Apellido', ['Apellido', 'apellido']],
    ['Material', ['Material', 'material']],
    ['Especificación', ['Especificación', 'especificacion', 'especificación']],
    ['Fecha Requerida', ['Fecha Requerida', 'fechaRequerida']],
    ['Recibo', ['Recibo', 'recibo']],
    ['ReciboURL', ['ReciboURL', 'reciboUrl', 'reciboURL']],
    ['Tipo de trabajo', ['Tipo de trabajo', 'tipoDeTrabajo', 'tipoTrabajo']],
    ['Puentes', ['Puentes', 'puentes']],
    ['Color Global', ['Color Global', 'colorGlobal', 'color']],
    ['Dientes seleccionados', ['Dientes Seleccionados', 'Dientes seleccionados', 'dientesSeleccionados', 'dientes']],
  ];

  for (const [target, keys] of extraMappings) {
    for (const key of keys) {
      const value = asString(item[key]);
      if (value) {
        row[target] = value;
        break;
      }
    }
  }

  return row;
}

function CeldaEstadoEditable({ orden, onChange }: { orden: OrderRow; onChange: (patch: OrderRow) => void }) {
  const [saving, setSaving] = useState(false);

  async function onChangeEstado(nuevo: string) {
    const orderId = orden['ID Orden'];
    if (!orderId) return;

    const prevEstado = orden.Estado ?? '';
    if (nuevo === prevEstado) return;
    const nextOrden = { ...orden, Estado: nuevo };
    onChange(nextOrden);
    setSaving(true);

    try {
      const requestBody = {
        token: API_TOKEN,
        action: 'update',
        keyColumn: 'ID Orden',
        keyValue: orderId,
        newStatus: nuevo,
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.ok) {
        toast.success(`Estado actualizado (${orderId})`);
      } else {
        onChange({ ...orden, Estado: prevEstado });
        toast.error(result.message || 'No se pudo actualizar el estado');
      }
    } catch (error: any) {
      onChange({ ...orden, Estado: prevEstado });
      toast.error(error?.message || 'No se pudo actualizar el estado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select value={orden.Estado || undefined} onValueChange={onChangeEstado} disabled={saving}>
      <SelectTrigger className="w-[200px] bg-secondary/50 border-[rgba(255,255,255,0.1)]">
        <SelectValue placeholder="-- Selecciona --" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-[rgba(255,255,255,0.1)]">
        {ESTADOS.map(estado => (
          <SelectItem key={estado} value={estado}>
            {estado}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const HomeSecretaria = () => {
  const { currentUser, changePassword } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [filteredOrders, setFilteredOrders] = useState<OrderRow[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [todayOrders, setTodayOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    if (currentUser?.requirePasswordChange) {
      setShowPasswordChange(true);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrdersByDate();
  }, [orders, selectedDate]);

  useEffect(() => {
    filterTodayOrders();
  }, [orders]);

  const fetchOrders = async () => {
    try {
      const GET_URL = `${API_URL}?token=${API_TOKEN}`;
      const response = await fetch(GET_URL);
      const data = await response.json();

      const sourceRows = Array.isArray(data?.rows) ? (data.rows as OrderRow[]) : [];
      setOrders(sourceRows);
    } catch (error) {
      toast.error('Error al cargar las órdenes');
      console.error(error);
    }
  };

  const filterOrdersByDate = () => {
    if (!selectedDate) {
      setFilteredOrders([]);
      return;
    }

    const filtered = orders.filter(order => {
      if (!order.Timestamp) return false;
      const orderDate = new Date(order.Timestamp);
      return (
        orderDate.getFullYear() === selectedDate.getFullYear() &&
        orderDate.getMonth() === selectedDate.getMonth() &&
        orderDate.getDate() === selectedDate.getDate()
      );
    });

    setFilteredOrders(filtered);
    setSearchResults(filtered);
    setHasSearched(true);
  };

  const filterTodayOrders = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = orders.filter(order => {
      if (!order.Timestamp) return false;
      const orderDate = new Date(order.Timestamp);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    setTodayOrders(filtered);
  };

  // Calculate designer chart data for last 7 days
  const getDesignerChartData = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const last7DaysOrders = orders.filter(order => {
      if (!order.Timestamp) return false;
      const orderDate = new Date(order.Timestamp);
      return orderDate >= sevenDaysAgo;
    });

    const dateUnitsMap: { [date: string]: { itzel: number; alan: number } } = {};
    
    last7DaysOrders.forEach(order => {
      const date = new Date(order.Timestamp).toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      const designer = (order.Diseñadores || '').toUpperCase();
      const units = parseInt(order['Piezas Dentales'] as string) || 0;
      
      if (!dateUnitsMap[date]) {
        dateUnitsMap[date] = { itzel: 0, alan: 0 };
      }
      
      if (designer === 'ITZEL') {
        dateUnitsMap[date].itzel += units;
      } else if (designer === 'ALAN') {
        dateUnitsMap[date].alan += units;
      }
    });

    return Object.entries(dateUnitsMap)
      .map(([date, units]) => ({
        fecha: date,
        Itzel: units.itzel,
        Alan: units.alan,
      }))
      .sort((a, b) => {
        const [dayA, monthA, yearA] = a.fecha.split('/');
        const [dayB, monthB, yearB] = b.fecha.split('/');
        return new Date(`${yearA}-${monthA}-${dayA}`).getTime() - new Date(`${yearB}-${monthB}-${dayB}`).getTime();
      });
  };

  const designerChartData = getDesignerChartData();

  const actualizarFila = (ordenActualizada: OrderRow) => {
    const orderId = ordenActualizada['ID Orden'];
    if (!orderId) return;

    setSearchResults(prev =>
      prev.map(item => (item['ID Orden'] === orderId ? { ...item, ...ordenActualizada } : item))
    );

    setOrders(prev => {
      const exists = prev.some(item => item['ID Orden'] === orderId);
      if (exists) {
        return prev.map(item => (item['ID Orden'] === orderId ? { ...item, ...ordenActualizada } : item));
      }
      return [...prev, ordenActualizada];
    });

    setSelectedOrder(prev =>
      prev && prev['ID Orden'] === orderId ? { ...prev, ...ordenActualizada } : prev
    );
  };


  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast.error('Ingrese un ID de orden para buscar');
      return;
    }
    
    // Format search term: if it's a number, convert to ORD-XXXX format
    let formattedSearchTerm = searchTerm.trim();
    if (/^\d+$/.test(formattedSearchTerm)) {
      const orderNumber = formattedSearchTerm.padStart(4, '0');
      formattedSearchTerm = `ORD-${orderNumber}`;
    }

    const results = orders.filter(order =>
      order['ID Orden']?.toLowerCase().includes(formattedSearchTerm.toLowerCase())
    );
    setSearchResults(results);
    setHasSearched(true);
    setSelectedOrder(null);
    if (results.length === 0) {
      toast.info('No se encontraron órdenes');
    }
  };

  const handleUpdateField = async (order: OrderRow, field: 'Diseñadores' | 'Repartidores', newValue: string) => {
    if (field === 'Diseñadores') {
      const orderId = order['ID Orden'];
      if (!orderId) {
        toast.error('Orden sin ID');
        return;
      }

      const prevValue = order.Diseñadores ?? '';
      const applyDesignerUpdate = (list: OrderRow[], value: string) =>
        list.map(item =>
          item['ID Orden'] === orderId
            ? {
                ...item,
                Diseñadores: value,
              }
            : item
        );

      const nextOrden: Orden = {
        id: orderId,
        disenador: newValue,
      };

      setOrders(prev => applyDesignerUpdate(prev, newValue));
      setSearchResults(prev => applyDesignerUpdate(prev, newValue));
      setSelectedOrder(prev =>
        prev && prev['ID Orden'] === orderId ? { ...prev, Diseñadores: newValue } : prev
      );

      try {
        const result = await actualizarDisenador({
          id: nextOrden.id,
          disenador: nextOrden.disenador ?? '',
        });
        toast.success(`Diseñador actualizado para ${result.id}`);
      } catch (error: any) {
        setOrders(prev => applyDesignerUpdate(prev, prevValue));
        setSearchResults(prev => applyDesignerUpdate(prev, prevValue));
        setSelectedOrder(prev =>
          prev && prev['ID Orden'] === orderId ? { ...prev, Diseñadores: prevValue } : prev
        );
        toast.error(error?.message || 'No se pudo actualizar el diseñador');
      }
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        token: API_TOKEN,
        action: 'update',
        keyColumn: 'ID Orden',
        keyValue: order['ID Orden'],
        newRepartidor: newValue,
        debug: true
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success(`${field} actualizado correctamente`);

        // Log the change
        console.log({
          user: currentUser?.username,
          orderId: order['ID Orden'],
          field,
          oldValue: order[field],
          newValue,
          timestamp: new Date().toISOString()
        });

        await fetchOrders();
        handleSearch();
      } else {
        toast.error(data.message || `Error al actualizar ${field}`);
      }
    } catch (error) {
      toast.error(`Error al actualizar ${field}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const showDetails = (order: OrderRow) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handlePasswordChange = (newPassword: string) => {
    changePassword(newPassword);
    setShowPasswordChange(false);
  };

  return (
    <>
      <PasswordChangeDialog 
        open={showPasswordChange} 
        onPasswordChange={handlePasswordChange}
      />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Búsqueda de Órdenes</h1>
            <p className="text-muted-foreground">Busque una orden por ID para ver y modificar Diseñadores/Repartidores</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button
                onClick={() => window.open('https://script.google.com/macros/s/AKfycbwF-dEFJO1lJsPplWf7SO5U3JwG9dTrQ4pWBTLuxS8jVokDLyeVumrCIowqkfDqUmMBQQ/exec', '_blank')}
                className="gap-2"
              >
                <Plus size={18} />
                Añadir Orden
              </Button>
              <Button
                onClick={() => window.open('https://script.google.com/macros/s/AKfycbwua6870QB8Sr0BLtnjjxKTyLs2CQY2ef5M0PXOhfJ4MLWhdf0rC6XPz7Tnm3r-yfft5g/exec', '_blank')}
                className="gap-2"
                variant="secondary"
              >
                <Plus size={18} />
                Añadir orden sencilla
              </Button>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Rol: Auxiliar
            </Badge>
          </div>
        </div>

        {/* Designer Chart - Last 7 Days */}
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Unidades Fresadas por Diseñador por Fecha (Últimos 7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            {designerChartData.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay datos disponibles para los últimos 7 días</p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={designerChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="fecha" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '11px' }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Itzel" 
                    stroke="#0088FE" 
                    strokeWidth={3}
                    name="Itzel"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Alan" 
                    stroke="#00C49F" 
                    strokeWidth={3}
                    name="Alan"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Órdenes de Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            {todayOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay órdenes nuevas para hoy</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.1)]">
                      <th className="text-left p-3 font-semibold">ID Orden</th>
                      <th className="text-left p-3 font-semibold">Fecha de registro</th>
                      <th className="text-left p-3 font-semibold">Estado</th>
                      <th className="text-left p-3 font-semibold">Nombre</th>
                      <th className="text-left p-3 font-semibold">Apellido</th>
                      <th className="text-left p-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayOrders.map((order) => {
                      const formatDateOnly = (timestamp?: string) => {
                        if (!timestamp) return '-';
                        const date = new Date(timestamp);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      };

                      return (
                        <tr key={order['ID Orden']} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                          <td className="p-3 font-medium">{order['ID Orden']}</td>
                          <td className="p-3">{formatDateOnly(order.Timestamp)}</td>
                          <td className="p-3">
                            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                              {order.Estado}
                            </span>
                          </td>
                          <td className="p-3">{order.Nombre || '-'}</td>
                          <td className="p-3">{order.Apellido || '-'}</td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => showDetails(order)}
                                className="gap-2"
                              >
                                <Eye size={16} />
                                Ver
                              </Button>
                              {order.Recibo && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(buildReciboUrl(order.Recibo!, 'a4'), '_blank')}
                                  className="gap-2"
                                >
                                  <FileText size={16} />
                                  Recibo
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Buscar Orden por ID</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Ingrese el ID de la orden"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                />
              </div>
              <Button onClick={handleSearch} className="gap-2">
                <Search size={18} />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Buscar por Fecha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm font-medium mb-2 block">Seleccionar Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Selecciona una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedDate(undefined);
                  setFilteredOrders([]);
                  setSearchResults([]);
                  setHasSearched(false);
                }}
              >
                Limpiar Filtro
              </Button>
            </div>
            {selectedDate && (
              <p className="text-sm text-muted-foreground mt-3">
                Mostrando {filteredOrders.length} órdenes para {format(selectedDate, "PPP")}
              </p>
            )}
          </CardContent>
        </Card>


        {hasSearched && (
          <Card className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader>
              <CardTitle>Resultados de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.1)]">
                      <th className="text-left p-3 font-semibold">ID Orden</th>
                      <th className="text-left p-3 font-semibold">Timestamp</th>
                      <th className="text-left p-3 font-semibold">Estado Actual</th>
                      <th className="text-left p-3 font-semibold">Nuevo Estado</th>
                      <th className="text-left p-3 font-semibold">Diseñadores</th>
                      <th className="text-left p-3 font-semibold">Repartidores</th>
                      <th className="text-left p-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((order, idx) => (
                      <tr key={order['ID Orden'] ?? idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                        <td className="p-3">{order['ID Orden']}</td>
                        <td className="p-3">
                          {order.Timestamp ? new Date(order.Timestamp).toLocaleString('es-ES') : ''}
                        </td>
                        <td className="p-3">
                          <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                            {order.Estado}
                          </span>
                        </td>
                        <td className="p-3">
                          <CeldaEstadoEditable orden={order} onChange={actualizarFila} />
                        </td>
                        <td className="p-3">
                          <Select
                            value={order.Diseñadores || 'Pendiente'}
                            onValueChange={(value) => handleUpdateField(order, 'Diseñadores', value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="w-[150px] bg-secondary/50 border-[rgba(255,255,255,0.1)]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DISEÑADORES.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Select
                            defaultValue={order.Repartidores || 'Pendiente'}
                            onValueChange={(value) => handleUpdateField(order, 'Repartidores', value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="w-[150px] bg-secondary/50 border-[rgba(255,255,255,0.1)]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REPARTIDORES.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => showDetails(order)}
                              className="gap-2"
                            >
                              <Eye size={16} />
                              Ver Detalles
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const receiptUrl = buildReciboUrl(order['ID Orden'], 'a4');
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
                    ))}
                    {searchResults.length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-muted-foreground" colSpan={7}>
                          Sin resultados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="glass-card max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles de la Orden (Solo Lectura)</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ID Orden</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder['ID Orden']}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Estado}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Diseñadores</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Diseñadores || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Repartidores</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Repartidores || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Nombre || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Apellido || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Requerida</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder['Fecha Requerida'] || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de trabajo</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder['Tipo de trabajo'] || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Material</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Material || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Especificación</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder['Especificación'] || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Puentes</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Puentes || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Color Global</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder['Color Global'] || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dientes seleccionados</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder['Dientes seleccionados'] || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      const receiptUrl = buildReciboUrl(selectedOrder['ID Orden'], 'a4');
                      window.open(receiptUrl, '_blank');
                    }}
                    className="w-full gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Recibo
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default HomeSecretaria;
