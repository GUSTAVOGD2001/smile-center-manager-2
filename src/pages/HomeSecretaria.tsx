import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Eye, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PasswordChangeDialog from '@/components/PasswordChangeDialog';
import { actualizarDisenador, actualizarEstadoOrden, obtenerOrdenesPorFecha } from '@/services/api';
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
      await actualizarEstadoOrden({ id: orderId, nuevoEstado: nuevo });
      toast.success(`Estado actualizado (${orderId})`);
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
      <SelectContent>
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
  const [searchDate, setSearchDate] = useState('');
  const [isSearchingByDate, setIsSearchingByDate] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [savingDesignerId, setSavingDesignerId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.requirePasswordChange) {
      setShowPasswordChange(true);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const GET_URL = `${API_URL}?token=${API_TOKEN}`;
      const response = await fetch(GET_URL);
      const data = await response.json();
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const filteredRows = (data.rows || []).filter((order: OrderRow) => {
        const orderDate = new Date(order.Timestamp);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      });
      
      setOrders(filteredRows);
    } catch (error) {
      toast.error('Error al cargar las órdenes');
      console.error(error);
    }
  };

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

  const buscarPorFecha = async () => {
    if (!searchDate) {
      toast.error('Selecciona una fecha');
      return;
    }

    setIsSearchingByDate(true);
    try {
      const items = await obtenerOrdenesPorFecha(searchDate);
      const mapped = items.map(mapOrdenResumenToOrderRow);
      setSearchResults(mapped);
      setHasSearched(true);
      setSelectedOrder(null);
      setOrders(prev => {
        const current = new Map(prev.map(item => [item['ID Orden'], item]));
        mapped.forEach(item => {
          const id = item['ID Orden'];
          if (id) {
            const existing = current.get(id) ?? {};
            current.set(id, { ...existing, ...item });
          }
        });
        return Array.from(current.values());
      });
      toast.success(`Se encontraron ${mapped.length} órdenes`);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo obtener la lista');
    } finally {
      setIsSearchingByDate(false);
    }
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

      setSavingDesignerId(orderId);
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
      } finally {
        setSavingDesignerId(null);
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
      if (data.success) {
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
        toast.error(`Error al actualizar ${field}`);
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
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Rol: Secretaria
          </Badge>
        </div>

        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Buscar Orden</CardTitle>
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
              <div className="flex flex-col">
                <Label className="text-sm font-medium">Fecha</Label>
                <Input
                  type="date"
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>
              <Button
                onClick={buscarPorFecha}
                className="gap-2"
                disabled={isSearchingByDate || !searchDate}
              >
                {isSearchingByDate ? 'Buscando...' : 'Buscar por fecha'}
              </Button>
            </div>
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
                            disabled={isLoading || savingDesignerId === order['ID Orden']}
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
                          {savingDesignerId === order['ID Orden'] && (
                            <p className="text-xs text-muted-foreground mt-1">Guardando…</p>
                          )}
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
