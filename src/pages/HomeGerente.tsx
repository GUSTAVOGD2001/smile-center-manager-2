import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, Upload, FileImage, Eye, FileText, Plus, Package, CheckCircle, Truck, AlertCircle, Smile, Printer, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { uploadEvidenceWithFiles } from '@/lib/uploadEvidence';
import { actualizarDisenador } from '@/services/api';
import type { Orden } from '@/types/orden';
import { buildReciboUrl } from '@/lib/urls';
import { PrintReceiptDialog } from '@/components/PrintReceiptDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import IngresosDentomex from './IngresosDentomex';
import EgresosDentomex from './EgresosDentomex';

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
  'Piezas Dentales'?: string;
  [key: string]: string | undefined;
}

const DISEÑADORES = ['ITZEL', 'ALAN', 'SARA', 'Pendiente'];
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
const DENTOMEX_API_URL = 'https://script.google.com/macros/s/AKfycbzNAgZOEE49sFO9PMtYD9UNigL59JJ7GmzggPl2_JFeFzogNOhCZWBS1A9kqF7BXMVS/exec?action=readAll&apiKey=123Tamarindo';

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

const HomeGerente = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [dentomexOrders, setDentomexOrders] = useState<OrderRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<OrderRow[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [dentomexSearchTerm, setDentomexSearchTerm] = useState('');
  const [dentomexSearchResults, setDentomexSearchResults] = useState<OrderRow[]>([]);
  const [hasDentomexSearched, setHasDentomexSearched] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoadingDentomex, setIsLoadingDentomex] = useState(true);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedOrderIdForPrint, setSelectedOrderIdForPrint] = useState('');
  
  // Form state para evidencias
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('');
  const [fecha, setFecha] = useState('');
  const [nota, setNota] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchDentomexOrders();
  }, []);

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

  const fetchDentomexOrders = async () => {
    try {
      const response = await fetch(DENTOMEX_API_URL);
      const data = await response.json();
      const sourceRows = Array.isArray(data?.rows) ? (data.rows as OrderRow[]) : [];
      setDentomexOrders(sourceRows);
    } catch (error) {
      toast.error('Error al cargar órdenes Dentomex');
      console.error(error);
    } finally {
      setIsLoadingDentomex(false);
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

  const handleDentomexSearch = () => {
    if (!dentomexSearchTerm.trim()) {
      toast.error('Ingrese un ID de orden para buscar');
      return;
    }
    
    let formattedSearchTerm = dentomexSearchTerm.trim();
    if (/^\d+$/.test(formattedSearchTerm)) {
      const orderNumber = formattedSearchTerm.padStart(4, '0');
      formattedSearchTerm = `ORD-${orderNumber}`;
    }

    const results = dentomexOrders.filter(order =>
      order['ID Orden']?.toLowerCase().includes(formattedSearchTerm.toLowerCase())
    );
    setDentomexSearchResults(results);
    setHasDentomexSearched(true);
    if (results.length === 0) {
      toast.info('No se encontraron órdenes en Dentomex');
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
      toast.error('Error al guardar evidencia');
    } finally {
      setIsSaving(false);
    }
  };

  // Dentomex Dashboard calculations
  const totalDentomexOrders = dentomexOrders.length;
  const readyForPickup = dentomexOrders.filter(o => o.Estado === 'Listo para recoger').length;
  const delivered = dentomexOrders.filter(o => o.Estado === 'Entregado').length;
  const pendingPayment = dentomexOrders.filter(o => o.Estado === 'Entregado-Pendiente de pago').length;
  
  const totalPiezasDentales = dentomexOrders.reduce((sum, order) => {
    const piezas = parseInt(order['Piezas Dentales'] || '0', 10);
    return sum + piezas;
  }, 0);

  const latest20DentomexOrders = [...dentomexOrders]
    .sort((a, b) => {
      const numA = parseInt(a['ID Orden']?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b['ID Orden']?.replace(/\D/g, '') || '0', 10);
      return numB - numA;
    })
    .slice(0, 20);

  const ordersByDay = dentomexOrders.reduce((acc: { [key: string]: number }, order) => {
    const date = new Date(order.Timestamp).toLocaleDateString('es-ES');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(ordersByDay)
    .map(([date, count]) => ({ date, orders: count }))
    .slice(-7);

  const kpiCards = [
    { title: 'Total Órdenes', value: totalDentomexOrders, icon: Package, color: 'text-blue-400' },
    { title: 'Total Piezas Dentales', value: totalPiezasDentales, icon: Smile, color: 'text-purple-400' },
    { title: 'Listo para Recoger', value: readyForPickup, icon: CheckCircle, color: 'text-primary' },
    { title: 'Entregado', value: delivered, icon: Truck, color: 'text-green-400' },
    { title: 'Pendiente de Pago', value: pendingPayment, icon: AlertCircle, color: 'text-yellow-400' },
  ];

  const formatDateValue = (value?: string) => {
    if (!value) return '-';
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return value;
    return parsedDate.toLocaleString('es-ES');
  };

  return (
    <Tabs defaultValue="diseñador" className="space-y-6">
      <TabsList className="grid w-full max-w-2xl grid-cols-5">
        <TabsTrigger value="diseñador">Inicio</TabsTrigger>
        <TabsTrigger value="dentomex">Dentomex</TabsTrigger>
        <TabsTrigger value="evidencias">Evidencias</TabsTrigger>
        <TabsTrigger value="ingresos-dentomex">Ingresos Dentomex</TabsTrigger>
        <TabsTrigger value="egresos-dentomex">Egresos Dentomex</TabsTrigger>
      </TabsList>

      {/* Tab de Inicio (Diseñador) */}
      <TabsContent value="diseñador" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Panel de Gerente</h1>
            <p className="text-muted-foreground">Búsqueda de órdenes y gestión</p>
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
            <Badge variant="outline" className="text-lg px-4 py-2">
              Rol: Gerente - {currentUser?.username}
            </Badge>
          </div>
        </div>

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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2">
                                <MoreVertical size={16} />
                                Opciones
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-[rgba(255,255,255,0.1)]">
                              <DropdownMenuItem onClick={() => showDetails(order)} className="cursor-pointer">
                                <Eye size={16} className="mr-2" />
                                Ver
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  const receiptUrl = buildReciboUrl(order['ID Orden'], 'a4');
                                  window.open(receiptUrl, '_blank');
                                }}
                                className="cursor-pointer"
                              >
                                <FileText size={16} className="mr-2" />
                                Ver Recibo
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedOrderIdForPrint(order['ID Orden']);
                                  setPrintDialogOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Printer size={16} className="mr-2" />
                                Imprimir recibo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {searchResults.length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-muted-foreground" colSpan={5}>
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
      </TabsContent>

      {/* Tab de Evidencias */}
      <TabsContent value="evidencias" className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Registro de Evidencias</h1>
          <p className="text-muted-foreground">Complete el formulario para registrar una evidencia</p>
        </div>

        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Formulario de Evidencia</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitEvidencia} className="space-y-4">
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
                <Input
                  id="tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Tipo de evidencia"
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  required
                />
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
                <Label htmlFor="nota">Nota</Label>
                <Textarea
                  id="nota"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Notas adicionales"
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-input">Archivos (opcional)</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="file-input"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setFiles(e.target.files)}
                    className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  />
                  <FileImage className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <Button type="submit" disabled={isSaving} className="gap-2 w-full">
                <Upload size={18} />
                {isSaving ? 'Guardando...' : 'Guardar Evidencia'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab de Dentomex */}
      <TabsContent value="dentomex" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard Dentomex</h1>
            <p className="text-muted-foreground">Vista general de órdenes Dentomex</p>
          </div>
          <Button
            onClick={() => window.open('https://script.google.com/macros/s/AKfycbwF-dEFJO1lJsPplWf7SO5U3JwG9dTrQ4pWBTLuxS8jVokDLyeVumrCIowqkfDqUmMBQQ/exec', '_blank')}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Añadir Orden
          </Button>
        </div>

        {/* Barra de búsqueda */}
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Buscar Orden Dentomex por ID</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Ingrese el ID de la orden"
                  value={dentomexSearchTerm}
                  onChange={(e) => setDentomexSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDentomexSearch()}
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                />
              </div>
              <Button onClick={handleDentomexSearch} className="gap-2">
                <Search size={18} />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados de búsqueda Dentomex */}
        {hasDentomexSearched && (
          <Card className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader>
              <CardTitle>Resultados de Búsqueda Dentomex</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.1)]">
                      <th className="text-left p-3 font-semibold">ID Orden</th>
                      <th className="text-left p-3 font-semibold">Fecha Requerida</th>
                      <th className="text-left p-3 font-semibold">Timestamp</th>
                      <th className="text-left p-3 font-semibold">Estado</th>
                      <th className="text-left p-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dentomexSearchResults.map((order, idx) => {
                      const timestampValue = order.Timestamp || order['Fecha de Registro'] || order.created_at;
                      const requiredDate = order['Fecha Requerida'] || order.fecha_requerida || order.requiredDate;

                      return (
                        <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                          <td className="p-3">{order['ID Orden']}</td>
                          <td className="p-3">{formatDateValue(requiredDate)}</td>
                          <td className="p-3">{formatDateValue(timestampValue)}</td>
                          <td className="p-3">
                            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                              {order.Estado}
                            </span>
                          </td>
                          <td className="p-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                  <MoreVertical size={16} />
                                  Opciones
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border-[rgba(255,255,255,0.1)]">
                                <DropdownMenuItem onClick={() => showDetails(order)} className="cursor-pointer">
                                  <Eye size={16} className="mr-2" />
                                  Ver
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    const receiptUrl = buildReciboUrl(order['ID Orden'], 'a4');
                                    window.open(receiptUrl, '_blank');
                                  }}
                                  className="cursor-pointer"
                                >
                                  <FileText size={16} className="mr-2" />
                                  Ver Recibo
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedOrderIdForPrint(order['ID Orden']);
                                    setPrintDialogOpen(true);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Printer size={16} className="mr-2" />
                                  Imprimir recibo
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                    {dentomexSearchResults.length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-muted-foreground" colSpan={5}>
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

        {isLoadingDentomex ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando datos Dentomex...</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {kpiCards.map((kpi) => (
                <Card key={kpi.title} className="glass-card hover-lift border-[rgba(255,255,255,0.1)]">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{kpi.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart */}
            <Card className="glass-card border-[rgba(255,255,255,0.1)]">
              <CardHeader>
                <CardTitle>Órdenes por Día (Últimos 7 días)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Orders Table */}
            <Card className="glass-card border-[rgba(255,255,255,0.1)]">
              <CardHeader>
                <CardTitle>Últimas 20 Órdenes Dentomex</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.1)]">
                        <th className="text-left p-3 font-semibold">ID Orden</th>
                        <th className="text-left p-3 font-semibold">Fecha Requerida</th>
                        <th className="text-left p-3 font-semibold">Timestamp</th>
                        <th className="text-left p-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latest20DentomexOrders.map((order, idx) => {
                        const timestampValue = order.Timestamp || order['Fecha de Registro'] || order.created_at;
                        const requiredDate = order['Fecha Requerida'] || order.fecha_requerida || order.requiredDate;

                        return (
                          <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                            <td className="p-3">{order['ID Orden']}</td>
                            <td className="p-3">{formatDateValue(requiredDate)}</td>
                            <td className="p-3">{formatDateValue(timestampValue)}</td>
                            <td className="p-3">
                              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                                {order.Estado}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      {/* Tab de Ingresos Dentomex */}
      <TabsContent value="ingresos-dentomex">
        <IngresosDentomex />
      </TabsContent>

      {/* Tab de Egresos Dentomex */}
      <TabsContent value="egresos-dentomex">
        <EgresosDentomex />
      </TabsContent>

      {/* Dialog de Detalles */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="glass-card max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Orden</DialogTitle>
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
                  <Label>Color Global</Label>
                  <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                    {selectedOrder['Color Global'] || 'N/A'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dientes Seleccionados</Label>
                  <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)] whitespace-pre-wrap font-mono text-sm">
                    {selectedOrder['Dientes Seleccionados'] || 'N/A'}
                  </div>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Puentes</Label>
                  <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                    {selectedOrder.Puentes || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PrintReceiptDialog
        orderId={selectedOrderIdForPrint}
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
      />
    </Tabs>
  );
};

export default HomeGerente;
