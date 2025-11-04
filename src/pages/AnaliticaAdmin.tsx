import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
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
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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

      {/* Units Summary */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Resumen de Piezas Dentales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AnaliticaAdmin;
