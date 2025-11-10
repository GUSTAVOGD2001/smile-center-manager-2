import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Search, Upload, FileImage, Eye, FileText, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { uploadEvidenceWithFiles } from '@/lib/uploadEvidence';
import { actualizarDisenador } from '@/services/api';
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
  [key: string]: string | undefined;
}

const DISEÑADORES = ['ITZEL', 'ALAN', 'Pendiente'];
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

const API_URL = 'https://script.google.com/macros/s/AKfycby0z-tq623Nxh9jTK7g9c5jXF8VQY_iqrL5IYs4J-7OGg3tUyfO7-5RZVFAtbh9KlhJMw/exec';
const API_TOKEN = 'Tamarindo123456';

const asString = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : undefined);

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

const HomeDiseñadores = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [filteredOrders, setFilteredOrders] = useState<OrderRow[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [todayOrders, setTodayOrders] = useState<OrderRow[]>([]);
  
  // Form state para evidencias
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('');
  const [fecha, setFecha] = useState('');
  const [nota, setNota] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

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

  const handleUpdateDesigner = async (order: OrderRow, newValue: string) => {
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
  };

  const showDetails = (order: OrderRow) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleSubmitEvidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo || !tipo || !fecha) {
      toast.error('Complete los campos obligatorios: Título, Tipo y Fecha');
      return;
    }

    setIsSaving(true);
    setStatusMessage('Guardando…');

    try {
      const payload = {
        apiKey: 'Tamarindo123456',
        action: 'evidencias.create' as const,
        titulo,
        tipo,
        fecha,
        nota,
      };

      const filesInput = document.getElementById('file-input') as HTMLInputElement | null;
      const pickedFiles = filesInput?.files
        ? Array.from(filesInput.files)
        : (files ? Array.from(files) : []);

      const data = await uploadEvidenceWithFiles(payload, pickedFiles);

      const evidenciaId = data.id || data.idEvidencia || 'N/A';
      toast.success(`Evidencia ${evidenciaId} creada correctamente`);
      setTitulo('');
      setTipo('');
      setFecha('');
      setNota('');
      setFiles(null);
      if (filesInput) filesInput.value = '';
    } catch (error) {
      console.error(error);
      setStatusMessage('Error al guardar evidencia.');
      toast.error('Error al guardar evidencia');
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Panel de Diseñador</h1>
          <p className="text-muted-foreground">Búsqueda de órdenes y registro de evidencias</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Rol: Diseñador - {currentUser?.username}
        </Badge>
      </div>

      {/* Órdenes de Hoy */}
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

      {/* Buscar Orden por ID */}
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

      {/* Buscar por Fecha */}
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

      {/* Resultados de búsqueda */}
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
                          onValueChange={(value) => handleUpdateDesigner(order, value)}
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
                        <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                          {order.Repartidores || 'Pendiente'}
                        </div>
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

      {/* Dialog de Detalles */}
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

      {/* Formulario de Registro de Evidencia */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Registrar Evidencia</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitEvidencia} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título de la evidencia"
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={tipo} onValueChange={setTipo} required>
                  <SelectTrigger className="bg-secondary/50 border-[rgba(255,255,255,0.1)]">
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="Discos">Discos</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-input">Imágenes</Label>
                <div className="relative">
                  <Input
                    id="file-input"
                    type="file"
                    name="files"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(e.target.files)}
                    className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  />
                  <FileImage className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nota">Nota</Label>
              <Textarea
                id="nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Escriba sus observaciones..."
                className="bg-secondary/50 border-[rgba(255,255,255,0.1)] min-h-[120px]"
              />
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Upload size={18} />
                {isSaving ? 'Guardando…' : 'Guardar Evidencia'}
              </Button>
              {statusMessage && (
                <p className={`text-sm ${statusMessage.includes('correctamente') ? 'text-green-400' : statusMessage.includes('Error') ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {statusMessage}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomeDiseñadores;
