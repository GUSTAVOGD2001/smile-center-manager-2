import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OrderRow {
  'ID Orden': string;
  'Tipo de Trabajo'?: string;
  [key: string]: string | undefined;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

const AnaliticaAdmin = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkType, setSelectedWorkType] = useState<string>('todos');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

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

  // Calculate frequency of work types
  const workTypeFrequency = orders.reduce((acc: { [key: string]: number }, order) => {
    const workType = order['Tipo de Trabajo'] || 'Sin especificar';
    acc[workType] = (acc[workType] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(workTypeFrequency).map(([name, value]) => ({
    name,
    value,
  }));

  // Calculate frequency of materials
  const materialFrequency = orders.reduce((acc: { [key: string]: number }, order) => {
    const material = order['Material'] || 'Sin especificar';
    acc[material] = (acc[material] || 0) + 1;
    return acc;
  }, {});

  const materialChartData = Object.entries(materialFrequency).map(([name, value]) => ({
    name,
    value,
  }));

  // Calculate total units (Piezas Dentales)
  const totalUnits = orders.reduce((sum, order) => {
    const units = parseInt(order['Piezas Dentales'] as string) || 0;
    return sum + units;
  }, 0);

  const averageUnits = orders.length > 0 ? (totalUnits / orders.length).toFixed(2) : '0';

  // Calculate units by work type and date range
  const filteredOrders = orders.filter(order => {
    const matchesWorkType = selectedWorkType === 'todos' || order['Tipo de Trabajo'] === selectedWorkType;
    
    if (!startDate && !endDate) return matchesWorkType;
    
    const orderDate = new Date(order['Timestamp']);
    const matchesStartDate = !startDate || orderDate >= startDate;
    const matchesEndDate = !endDate || orderDate <= endDate;
    
    return matchesWorkType && matchesStartDate && matchesEndDate;
  });

  const filteredTotalUnits = filteredOrders.reduce((sum, order) => {
    const units = parseInt(order['Piezas Dentales'] as string) || 0;
    return sum + units;
  }, 0);

  // Calculate units by designer and date
  const dateUnitsMap: { [date: string]: { itzel: number; alan: number } } = {};
  
  orders.forEach(order => {
    const date = new Date(order['Timestamp']).toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    const designer = (order['Diseñadores'] || '').toUpperCase();
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

  const designerChartData = Object.entries(dateUnitsMap)
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

  // Calculate top 7 clients by number of orders
  const clientsMap: { [client: string]: { orders: number; spent: number; pieces: number } } = {};
  
  orders.forEach(order => {
    const nombre = order['Nombre'] || '';
    const apellido = order['Apellido'] || '';
    const clientName = `${nombre} ${apellido}`.trim() || 'Sin nombre';
    const costo = parseFloat(order['Costo'] || '0');
    const piezas = parseInt(order['Piezas Dentales'] || '0');
    
    if (!clientsMap[clientName]) {
      clientsMap[clientName] = { orders: 0, spent: 0, pieces: 0 };
    }
    
    clientsMap[clientName].orders += 1;
    clientsMap[clientName].spent += costo;
    clientsMap[clientName].pieces += piezas;
  });

  const topClients = Object.entries(clientsMap)
    .map(([name, data]) => ({
      name,
      orders: data.orders,
      spent: data.spent,
      pieces: data.pieces,
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 7);

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
        <h1 className="text-3xl font-bold mb-2">Analítica</h1>
        <p className="text-muted-foreground">Análisis de tipos de trabajo</p>
      </div>

      {/* Units Summary - First */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Resumen de Piezas Dentales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-secondary/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Total de Órdenes</p>
              <p className="text-3xl font-bold">{orders.length}</p>
            </div>
            <div className="text-center p-4 bg-secondary/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Total de Piezas</p>
              <p className="text-3xl font-bold">{totalUnits}</p>
            </div>
            <div className="text-center p-4 bg-secondary/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Promedio por Orden</p>
              <p className="text-3xl font-bold">{averageUnits}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold">Tipo de Trabajo:</label>
                <Select value={selectedWorkType} onValueChange={setSelectedWorkType}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {chartData.map((item) => (
                      <SelectItem key={item.name} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold">Fecha Inicio:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold">Fecha Fin:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                  className="text-sm"
                >
                  Limpiar fechas
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Órdenes del Tipo Seleccionado</p>
                <p className="text-3xl font-bold">{filteredOrders.length}</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Piezas del Tipo Seleccionado</p>
                <p className="text-3xl font-bold">{filteredTotalUnits}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Designer Line Chart */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Unidades Fresadas por Diseñador por Fecha</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={designerChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="fecha" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '11px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                label={{ value: 'Unidades', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Itzel" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="Alan" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top 7 Clients Table */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Top 7 Clientes por Número de Órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="text-right font-semibold">Órdenes</TableHead>
                  <TableHead className="text-right font-semibold">Total Gastado</TableHead>
                  <TableHead className="text-right font-semibold">Piezas Dentales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((client, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-right">{client.orders}</TableCell>
                    <TableCell className="text-right">
                      ${client.spent.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">{client.pieces}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Frecuencia de Tipos de Trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => percent >= 0.09 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Resumen por Tipo de Trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)]">
                  <th className="text-left p-3 font-semibold">Tipo de Trabajo</th>
                  <th className="text-right p-3 font-semibold">Cantidad</th>
                  <th className="text-right p-3 font-semibold">Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, idx) => {
                  const percentage = ((item.value / orders.length) * 100).toFixed(1);
                  return (
                    <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                      <td className="p-3">{item.name}</td>
                      <td className="text-right p-3">{item.value}</td>
                      <td className="text-right p-3">{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Material Chart */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Frecuencia de Materiales</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={materialChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => percent >= 0.09 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {materialChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Material Summary Table */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Resumen por Material</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)]">
                  <th className="text-left p-3 font-semibold">Material</th>
                  <th className="text-right p-3 font-semibold">Cantidad</th>
                  <th className="text-right p-3 font-semibold">Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                {materialChartData.map((item, idx) => {
                  const percentage = ((item.value / orders.length) * 100).toFixed(1);
                  return (
                    <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                      <td className="p-3">{item.name}</td>
                      <td className="text-right p-3">{item.value}</td>
                      <td className="text-right p-3">{percentage}%</td>
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

export default AnaliticaAdmin;
