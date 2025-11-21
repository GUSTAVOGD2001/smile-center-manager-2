import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CalendarIcon, DollarSign, Wallet, FileText, Printer, Layers, MoreVertical, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { buildReciboUrl } from '@/lib/urls';
import { PrintReceiptDialog } from '@/components/PrintReceiptDialog';
import { ACuentaDialog } from '@/components/ACuentaDialog';

interface OrderRow {
  'ID Orden': string;
  Timestamp: string;
  Estado: string;
  [key: string]: string;
}

interface FresadoRow {
  'ID Orden': string;
  Fecha?: string;
  Unidades?: number;
  [key: string]: string | number | boolean | undefined;
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
  const [fresados, setFresados] = useState<FresadoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dateTo, setDateTo] = useState<Date>();
  const [searchName, setSearchName] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [filteredOrders, setFilteredOrders] = useState<OrderRow[]>([]);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedOrderIdForPrint, setSelectedOrderIdForPrint] = useState('');
  const [aCuentaDialogOpen, setACuentaDialogOpen] = useState(false);
  const [selectedOrderForACuenta, setSelectedOrderForACuenta] = useState<OrderRow | null>(null);
  const [filterFresadas, setFilterFresadas] = useState<'all' | 'fresadas' | 'noFresadas'>('all');

  useEffect(() => {
    fetchOrders();
    fetchFresados();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, dateFrom, dateTo, searchName, searchOrderId]);

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

    if (searchOrderId) {
      filtered = filtered.filter(order => {
        const orderId = order['ID Orden']?.toLowerCase() || '';
        return orderId.includes(searchOrderId.toLowerCase());
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

  const fetchFresados = async () => {
    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbxeNTiBOeTTuhMaPzZ9oMVQ3JlzeYEaCqjygo_0JpEIwdNd4bn3ZwhJXSvBTSzjwihIkA/exec');
      const data = await response.json();
      const rowsData = Array.isArray(data) ? data : (data.rows || []);
      setFresados(rowsData);
    } catch (error) {
      toast.error('Error al cargar historial de fresados');
      console.error(error);
    }
  };

  const isOrderFresado = (orderId: string): boolean => {
    return fresados.some(f => f['ID Orden'] === orderId);
  };

  const getPiezasFresadas = (orderId: string): number => {
    return fresados
      .filter(f => f['ID Orden'] === orderId)
      .reduce((sum, f) => sum + (Number(f.Unidades) || 0), 0);
  };

  const getFechaFresado = (orderId: string): string => {
    const fresadosOrden = fresados.filter(f => f['ID Orden'] === orderId);
    if (fresadosOrden.length === 0) return '-';
    
    // Si hay múltiples fresados, mostrar la fecha más reciente
    const fechas = fresadosOrden
      .map(f => f.Fecha)
      .filter(f => f)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    
    return fechas[0] ? format(new Date(fechas[0]), 'dd/MM/yyyy') : '-';
  };

  const getDiscoFresado = (orderId: string): string => {
    const fresadosOrden = fresados.filter(f => f['ID Orden'] === orderId);
    if (fresadosOrden.length === 0) return '-';
    
    // Obtener discos únicos
    const discos = [...new Set(fresadosOrden.map(f => f.Disco).filter(d => d))];
    return discos.join(', ') || '-';
  };

  const getMaterialFresado = (orderId: string): string => {
    const fresadosOrden = fresados.filter(f => f['ID Orden'] === orderId);
    if (fresadosOrden.length === 0) return '-';
    
    // Función helper para obtener material del disco
    const getMaterial = (disco?: string): string => {
      if (!disco) return '';
      const firstChar = disco.charAt(0).toUpperCase();
      if (firstChar === 'Z') return 'Zirconia';
      if (firstChar === 'P') return 'PMMA';
      if (firstChar === 'W') return 'Cera';
      return '';
    };
    
    // Obtener materiales únicos
    const materiales = [...new Set(fresadosOrden.map(f => getMaterial(f.Disco as string)).filter(m => m))];
    return materiales.join(', ') || '-';
  };

  const ordenesFresadas = filteredOrders.filter(order => isOrderFresado(order['ID Orden']));
  const ordenesNoFresadas = filteredOrders.filter(order => !isOrderFresado(order['ID Orden']));

  const filteredOrdersByFresado = filteredOrders.filter(order => {
    const orderId = order['ID Orden'];
    const isFresado = isOrderFresado(orderId);
    
    if (filterFresadas === 'fresadas') return isFresado;
    if (filterFresadas === 'noFresadas') return !isFresado;
    return true; // 'all'
  });

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
      toast.success('A cuenta actualizado correctamente');
    } catch (error: any) {
      console.error('Error al actualizar A cuenta:', error);
      toast.error(error.message || 'Error al actualizar A cuenta');
      throw error;
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

      <Tabs defaultValue="estados" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="estados">Gestión de Estados</TabsTrigger>
          <TabsTrigger value="fresados">Estado de Fresados</TabsTrigger>
        </TabsList>

        <TabsContent value="estados" className="space-y-6 mt-6">

      {/* Filtros */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Buscar por nombre..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              />
              <Input
                placeholder="Buscar por número de orden (ej: ORD-0001)..."
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
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
                  setSearchOrderId('');
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrderForACuenta(order);
                            setACuentaDialogOpen(true);
                          }}
                          disabled={isUpdating}
                          className="w-28"
                        >
                          ${order['A Cuenta'] || '0'}
                        </Button>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2">
                                <MoreVertical size={16} />
                                Opciones
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-[rgba(255,255,255,0.1)]">
                              <DropdownMenuItem 
                                onClick={() => {
                                  const receiptUrl = buildReciboUrl(orderId, 'a4');
                                  window.open(receiptUrl, '_blank');
                                }}
                                className="cursor-pointer"
                              >
                                <FileText size={16} className="mr-2" />
                                Ver Recibo
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedOrderIdForPrint(orderId);
                                  setPrintDialogOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Printer size={16} className="mr-2" />
                                Imprimir recibo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
        </TabsContent>

        <TabsContent value="fresados" className="space-y-6 mt-6">
          {/* Filtros */}
          <Card className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Buscar por nombre..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  />
                  <Input
                    placeholder="Buscar por número de orden (ej: ORD-0001)..."
                    value={searchOrderId}
                    onChange={(e) => setSearchOrderId(e.target.value)}
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
                      setSearchOrderId('');
                      setFilterFresadas('all');
                    }}
                  >
                    Limpiar Filtros
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="fresadas-switch"
                      checked={filterFresadas === 'fresadas'}
                      onCheckedChange={(checked) => setFilterFresadas(checked ? 'fresadas' : 'all')}
                    />
                    <Label htmlFor="fresadas-switch" className="cursor-pointer">Solo Fresadas</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="no-fresadas-switch"
                      checked={filterFresadas === 'noFresadas'}
                      onCheckedChange={(checked) => setFilterFresadas(checked ? 'noFresadas' : 'all')}
                    />
                    <Label htmlFor="no-fresadas-switch" className="cursor-pointer">Solo No Fresadas</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card hover-lift border-[rgba(255,255,255,0.1)]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Órdenes Fresadas</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{ordenesFresadas.length}</div>
              </CardContent>
            </Card>
            <Card className="glass-card hover-lift border-[rgba(255,255,255,0.1)]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Órdenes No Fresadas</CardTitle>
                <XCircle className="h-5 w-5 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{ordenesNoFresadas.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de estado de fresados */}
          <Card className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader>
              <CardTitle>Estado de Fresados de Órdenes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.1)]">
                      <th className="text-left p-3 font-semibold">ID Orden</th>
                      <th className="text-left p-3 font-semibold">Fecha de Registro</th>
                      <th className="text-left p-3 font-semibold">Nombre</th>
                      <th className="text-left p-3 font-semibold">Fresado</th>
                      <th className="text-left p-3 font-semibold">Disco</th>
                      <th className="text-left p-3 font-semibold">Material</th>
                      <th className="text-left p-3 font-semibold">Fecha de Fresado</th>
                      <th className="text-left p-3 font-semibold">Piezas Dentales</th>
                      <th className="text-left p-3 font-semibold">Piezas Fresadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrdersByFresado.map((order, idx) => {
                      const orderId = order['ID Orden'];
                      const isFresado = isOrderFresado(orderId);
                      const piezasFresadas = getPiezasFresadas(orderId);
                      const piezasDentales = parseInt(order['Piezas Dentales'] || '0');
                      const disco = getDiscoFresado(orderId);
                      const material = getMaterialFresado(orderId);
                      const fechaFresado = getFechaFresado(orderId);

                      return (
                        <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                          <td className="p-3">{orderId}</td>
                          <td className="p-3">{fmtFecha(order.Timestamp)}</td>
                          <td className="p-3">{order['Nombre']} {order['Apellido']}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Checkbox checked={isFresado} disabled />
                              {isFresado && <span className="text-green-400 text-sm">Fresado</span>}
                            </div>
                          </td>
                          <td className="p-3">{disco}</td>
                          <td className="p-3">{material}</td>
                          <td className="p-3">{fechaFresado}</td>
                          <td className="p-3">{piezasDentales}</td>
                          <td className="p-3">
                            <span className={cn(
                              "font-semibold",
                              piezasFresadas === piezasDentales ? "text-green-400" : 
                              piezasFresadas > 0 ? "text-yellow-400" : "text-muted-foreground"
                            )}>
                              {piezasFresadas}
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
        </TabsContent>
      </Tabs>

      <PrintReceiptDialog
        orderId={selectedOrderIdForPrint}
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
      />

      {selectedOrderForACuenta && (
        <ACuentaDialog
          open={aCuentaDialogOpen}
          onOpenChange={setACuentaDialogOpen}
          orderId={selectedOrderForACuenta['ID Orden']}
          currentACuenta={parseFloat(selectedOrderForACuenta['A Cuenta'] || '0')}
          costo={parseFloat(selectedOrderForACuenta['Costo'] || '0')}
          onSuccess={fetchOrders}
          onUpdateACuenta={async (orderId, newValue) => {
            await updateACuenta(selectedOrderForACuenta, newValue);
          }}
        />
      )}
    </div>
  );
};

export default ModificarEstados;
