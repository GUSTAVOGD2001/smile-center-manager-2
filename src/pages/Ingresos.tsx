import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DollarSign, TrendingUp, Calendar, Plus, CalendarIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateDMY, parseAnyDate } from '@/utils/date';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL_GET  = "https://script.google.com/macros/s/AKfycby98jkVeS7ANZsN-44l4WuCb2mFU2S-t1uBetIjVUFiRd5HqznDpUrFgo-tTX9nmEhfqA/exec?key=123tamarindo";
const API_URL_POST = "https://script.google.com/macros/s/AKfycby98jkVeS7ANZsN-44l4WuCb2mFU2S-t1uBetIjVUFiRd5HqznDpUrFgo-tTX9nmEhfqA/exec";
const API_KEY = "123tamarindo";

interface Ingreso {
  'ID Ingreso': string;
  'ID ORDEN': string;
  Fecha: string;
  'Monto de Ingreso': number;
  'Metodo de Pago': string;
  Motivo: string;
}

interface IngresosData {
  ok: boolean;
  total: number;
  metodosDePago: string[];
  ingresos: Ingreso[];
}

async function getIngresos(): Promise<IngresosData> {
  const res = await fetch(API_URL_GET);
  const data = await res.json();
  return data;
}

async function crearIngreso({ idOrden, fecha, monto, metodoPago, motivo }: { 
  idOrden: string;
  fecha: string; 
  monto: number; 
  metodoPago: string; 
  motivo: string 
}) {
  const payload = {
    apiKey: API_KEY,
    idOrden: idOrden,
    fecha: fecha || "",
    monto: monto,
    metodoPago: metodoPago,
    motivo: motivo
  };

  const res = await fetch(API_URL_POST, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  return data;
}

const Ingresos = () => {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [metodosDePago, setMetodosDePago] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metodoPagoFilter, setMetodoPagoFilter] = useState<string>('Todos');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    idOrden: '',
    fecha: '',
    monto: '',
    metodoPago: '',
    motivo: ''
  });

  useEffect(() => {
    fetchIngresos();
  }, []);

  const fetchIngresos = async () => {
    try {
      setIsLoading(true);
      const data = await getIngresos();
      setIngresos(data.ingresos || []);
      setMetodosDePago(data.metodosDePago || []);
    } catch (error) {
      toast.error('Error al cargar los ingresos');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.idOrden || !formData.monto || !formData.metodoPago || !formData.motivo) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      await crearIngreso({
        idOrden: formData.idOrden,
        fecha: formData.fecha,
        monto: parseFloat(formData.monto),
        metodoPago: formData.metodoPago,
        motivo: formData.motivo
      });
      
      toast.success('Ingreso creado exitosamente');
      setFormData({ idOrden: '', fecha: '', monto: '', metodoPago: '', motivo: '' });
      setShowForm(false);
      fetchIngresos();
    } catch (error) {
      toast.error('Error al crear el ingreso');
      console.error(error);
    }
  };

  const filteredIngresos = ingresos.filter(i => {
    // Filter by payment method
    const matchesMetodo = metodoPagoFilter === 'Todos' || i['Metodo de Pago'] === metodoPagoFilter;
    
    // Filter by date range
    const ingresoDate = parseAnyDate(i.Fecha);
    const matchesDateFrom = !dateFrom || !ingresoDate || ingresoDate >= dateFrom;
    const matchesDateTo = !dateTo || !ingresoDate || ingresoDate <= dateTo;
    
    return matchesMetodo && matchesDateFrom && matchesDateTo;
  });

  const totalIngresos = filteredIngresos.reduce((sum, i) => sum + (parseFloat(String(i['Monto de Ingreso'])) || 0), 0);
  const ingresoPromedio = filteredIngresos.length > 0 ? totalIngresos / filteredIngresos.length : 0;
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  // Get current month's ingresos
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const ingresosMesActual = ingresos.filter(i => {
    const ingresoDate = new Date(i.Fecha);
    return ingresoDate.getMonth() === currentMonth && ingresoDate.getFullYear() === currentYear;
  });
  const totalMesActual = ingresosMesActual.reduce((sum, i) => sum + (parseFloat(String(i['Monto de Ingreso'])) || 0), 0);

  // Group ingresos by day for chart
  const ingresosByDay = filteredIngresos.reduce((acc: { [key: string]: number }, ingreso) => {
    const date = new Date(ingreso.Fecha).toLocaleDateString('es-ES');
    acc[date] = (acc[date] || 0) + (parseFloat(String(ingreso['Monto de Ingreso'])) || 0);
    return acc;
  }, {});

  const chartData = Object.entries(ingresosByDay)
    .map(([date, monto]) => ({ date, monto }))
    .slice(-7);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando ingresos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ingresos</h1>
          <p className="text-muted-foreground">Gestión de ingresos</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancelar' : 'Añadir Ingreso'}
        </Button>
      </div>

      {/* Form to add new ingreso */}
      {showForm && (
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Nuevo Ingreso</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idOrden">ID ORDEN *</Label>
                  <Input
                    id="idOrden"
                    type="text"
                    placeholder="ORD-0001"
                    value={formData.idOrden}
                    onChange={(e) => setFormData({ ...formData, idOrden: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha (opcional)</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto *</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metodoPago">Método de Pago *</Label>
                  <Select
                    value={formData.metodoPago}
                    onValueChange={(value) => setFormData({ ...formData, metodoPago: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cuenta BBVA Karla">Cuenta BBVA Karla</SelectItem>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Cuenta BBVA Lalo">Cuenta BBVA Lalo</SelectItem>
                      <SelectItem value="Cuenta MP Lalo">Cuenta MP Lalo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="motivo">Motivo *</Label>
                  <Input
                    id="motivo"
                    type="text"
                    placeholder="Descripción del ingreso"
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Guardar Ingreso
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card hover-lift border-[rgba(255,255,255,0.1)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ingresos</CardTitle>
            <DollarSign className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${formatCurrency(totalIngresos)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredIngresos.length} ingresos registrados
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover-lift border-[rgba(255,255,255,0.1)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingreso Promedio</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${formatCurrency(ingresoPromedio)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Por ingreso
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover-lift border-[rgba(255,255,255,0.1)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mes Actual</CardTitle>
            <Calendar className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${formatCurrency(totalMesActual)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {ingresosMesActual.length} ingresos este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Ingresos por Día (Últimos 7 días)</CardTitle>
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
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Line type="monotone" dataKey="monto" stroke="hsl(var(--primary))" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="filter-metodo">Método de pago:</Label>
              <Select value={metodoPagoFilter} onValueChange={setMetodoPagoFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {metodosDePago.map((metodo) => (
                    <SelectItem key={metodo} value={metodo}>
                      {metodo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <Label>Fecha:</Label>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Desde"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Hasta"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                  title="Limpiar filtros de fecha"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingresos Table */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Lista de Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)]">
                  <th className="text-left p-3 font-semibold">ID Ingreso</th>
                  <th className="text-left p-3 font-semibold">ID ORDEN</th>
                  <th className="text-left p-3 font-semibold">Fecha</th>
                  <th className="text-left p-3 font-semibold">Monto de Ingreso</th>
                  <th className="text-left p-3 font-semibold">Metodo de Pago</th>
                  <th className="text-left p-3 font-semibold">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngresos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No hay ingresos registrados
                    </td>
                  </tr>
                ) : (
                  filteredIngresos.map((ingreso, idx) => (
                    <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                      <td className="p-3">{ingreso['ID Ingreso']}</td>
                      <td className="p-3">{ingreso['ID ORDEN']}</td>
                      <td className="p-3">{formatDateDMY(ingreso.Fecha)}</td>
                      <td className="p-3 font-semibold text-green-400">
                        ${parseFloat(String(ingreso['Monto de Ingreso'])).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                          {ingreso['Metodo de Pago']}
                        </span>
                      </td>
                      <td className="p-3">{ingreso.Motivo}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ingresos;
