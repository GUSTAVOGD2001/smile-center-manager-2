import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DollarSign, TrendingUp, Calendar, Plus, CalendarIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateDMY, parseAnyDate } from '@/utils/date';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL_GET  = "https://script.google.com/macros/s/AKfycbzPH4c7EukmqID9K_fWdI30pZ6yWSA8zEW1sFsSKOkCa_5we4BeRgtDIuiXan4mWLDcTA/exec?key=123tamarindo";
const API_URL_POST = "https://script.google.com/macros/s/AKfycbzPH4c7EukmqID9K_fWdI30pZ6yWSA8zEW1sFsSKOkCa_5we4BeRgtDIuiXan4mWLDcTA/exec";
const API_KEY = "123tamarindo";

interface Gasto {
  'ID Gasto': string;
  Fecha: string;
  'Monto de Gasto': number;
  Categoria: string;
  Motivo: string;
}

interface GastosData {
  gastos: Gasto[];
  categorias: string[];
}

async function getGastos(): Promise<GastosData> {
  const res = await fetch(API_URL_GET);
  const data = await res.json();
  return data;
}

async function crearGasto({ fecha, monto, categoria, motivo }: { 
  fecha: string; 
  monto: number; 
  categoria: string; 
  motivo: string 
}) {
  const payload = {
    apiKey: API_KEY,
    fecha: fecha || "",
    monto: monto,
    categoria: categoria,
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

const Finanzas = () => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoriaFilter, setCategoriaFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fecha: '',
    monto: '',
    categoria: '',
    motivo: ''
  });

  useEffect(() => {
    fetchGastos();
  }, []);

  const fetchGastos = async () => {
    try {
      setIsLoading(true);
      const data = await getGastos();
      setGastos(data.gastos || []);
      setCategorias(data.categorias || []);
    } catch (error) {
      toast.error('Error al cargar los gastos');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.monto || !formData.categoria || !formData.motivo) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      await crearGasto({
        fecha: formData.fecha,
        monto: parseFloat(formData.monto),
        categoria: formData.categoria,
        motivo: formData.motivo
      });
      
      toast.success('Gasto creado exitosamente');
      setFormData({ fecha: '', monto: '', categoria: '', motivo: '' });
      setShowForm(false);
      fetchGastos();
    } catch (error) {
      toast.error('Error al crear el gasto');
      console.error(error);
    }
  };

  const filteredGastos = gastos.filter(g => {
    // Filter by category
    const matchesCategoria = categoriaFilter.length === 0 || categoriaFilter.includes(g.Categoria);
    
    // Filter by date range
    const gastoDate = parseAnyDate(g.Fecha);
    const matchesDateFrom = !dateFrom || !gastoDate || gastoDate >= dateFrom;
    const matchesDateTo = !dateTo || !gastoDate || gastoDate <= dateTo;
    
    return matchesCategoria && matchesDateFrom && matchesDateTo;
  });

  const totalGastos = filteredGastos.reduce((sum, g) => sum + (parseFloat(String(g['Monto de Gasto'])) || 0), 0);
  const gastoPromedio = filteredGastos.length > 0 ? totalGastos / filteredGastos.length : 0;
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  // Get current month's gastos
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const gastosMesActual = gastos.filter(g => {
    const gastoDate = new Date(g.Fecha);
    return gastoDate.getMonth() === currentMonth && gastoDate.getFullYear() === currentYear;
  });
  const totalMesActual = gastosMesActual.reduce((sum, g) => sum + (parseFloat(String(g['Monto de Gasto'])) || 0), 0);

  // Group gastos by day for chart
  const gastosByDay = filteredGastos.reduce((acc: { [key: string]: number }, gasto) => {
    const date = new Date(gasto.Fecha).toLocaleDateString('es-ES');
    acc[date] = (acc[date] || 0) + (parseFloat(String(gasto['Monto de Gasto'])) || 0);
    return acc;
  }, {});

  const chartData = Object.entries(gastosByDay)
    .map(([date, monto]) => ({ date, monto }))
    .slice(-7);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando gastos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Egresos</h1>
          <p className="text-muted-foreground">Gestión de gastos</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancelar' : 'Añadir Gasto'}
        </Button>
      </div>

      {/* Form to add new gasto */}
      {showForm && (
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Nuevo Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="categoria">Categoría *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laboratorio">Laboratorio</SelectItem>
                      <SelectItem value="Doctor">Doctor</SelectItem>
                      <SelectItem value="Consultorio">Consultorio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo *</Label>
                  <Input
                    id="motivo"
                    type="text"
                    placeholder="Descripción del gasto"
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Guardar Gasto
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card hover-lift border-[rgba(255,255,255,0.1)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gastos</CardTitle>
            <DollarSign className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${formatCurrency(totalGastos)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredGastos.length} gastos registrados
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover-lift border-[rgba(255,255,255,0.1)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gasto Promedio</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${formatCurrency(gastoPromedio)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Por gasto
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
              {gastosMesActual.length} gastos este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Egresos por Día (Últimos 7 días)</CardTitle>
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
          <h3 className="text-lg font-semibold mb-4">Filtros</h3>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Label>Categoría:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[200px] justify-start text-left font-normal"
                  >
                    {categoriaFilter.length === 0
                      ? "Todas"
                      : `${categoriaFilter.length} seleccionada(s)`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3" align="start">
                  <div className="space-y-2">
                    {categorias.map((cat) => (
                      <div key={cat} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cat-${cat}`}
                          checked={categoriaFilter.includes(cat)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCategoriaFilter([...categoriaFilter, cat]);
                            } else {
                              setCategoriaFilter(categoriaFilter.filter((c) => c !== cat));
                            }
                          }}
                        />
                        <label
                          htmlFor={`cat-${cat}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {cat}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
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

      {/* Gastos Table */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Lista de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)]">
                  <th className="text-left p-3 font-semibold">ID Gasto</th>
                  <th className="text-left p-3 font-semibold">Fecha</th>
                  <th className="text-left p-3 font-semibold">Monto de Gasto</th>
                  <th className="text-left p-3 font-semibold">Categoría</th>
                  <th className="text-left p-3 font-semibold">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {filteredGastos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No hay gastos registrados
                    </td>
                  </tr>
                ) : (
                  filteredGastos.map((gasto, idx) => (
                    <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                      <td className="p-3">{gasto['ID Gasto']}</td>
                      <td className="p-3">{formatDateDMY(gasto.Fecha)}</td>
                      <td className="p-3 font-semibold text-green-400">
                        ${parseFloat(String(gasto['Monto de Gasto'])).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                          {gasto.Categoria}
                        </span>
                      </td>
                      <td className="p-3">{gasto.Motivo}</td>
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

export default Finanzas;
