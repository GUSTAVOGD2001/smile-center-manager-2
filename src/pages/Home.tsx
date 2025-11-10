import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, CheckCircle, Truck, AlertCircle, Smile, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import AnaliticaAdmin from './AnaliticaAdmin';

interface OrderRow {
  'ID Orden': string;
  Timestamp?: string;
  Estado?: string;
  'Fecha de Registro'?: string;
  'Fecha Requerida'?: string;
  fecha_requerida?: string;
  requiredDate?: string;
  created_at?: string;
  [key: string]: string | undefined;
}

const Home = () => {
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

  const totalOrders = orders.length;
  const readyForPickup = orders.filter(o => o.Estado === 'Listo para recoger').length;
  const delivered = orders.filter(o => o.Estado === 'Entregado').length;
  const pendingPayment = orders.filter(o => o.Estado === 'Entregado-Pendiente de pago').length;

  const latest20Orders = [...orders]
    .sort((a, b) => {
      // Extract numeric part from ID Orden (e.g., "ORD-0001" -> 1)
      const numA = parseInt(a['ID Orden']?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b['ID Orden']?.replace(/\D/g, '') || '0', 10);
      
      // Sort descending (mayor a menor)
      return numB - numA;
    })
    .slice(0, 20);

  const formatDateValue = (value?: string) => {
    if (!value) {
      return '-';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return parsedDate.toLocaleString('es-ES');
  };
  
  // Calculate total Piezas Dentales
  const totalPiezasDentales = orders.reduce((sum, order) => {
    const piezas = parseInt(order['Piezas Dentales'] || '0', 10);
    return sum + piezas;
  }, 0);

  // Group orders by day
  const ordersByDay = orders.reduce((acc: { [key: string]: number }, order) => {
    const date = new Date(order.Timestamp).toLocaleDateString('es-ES');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(ordersByDay)
    .map(([date, count]) => ({ date, orders: count }))
    .slice(-7);

  const kpiCards = [
    { title: 'Total Órdenes', value: totalOrders, icon: Package, color: 'text-blue-400' },
    { title: 'Total Piezas Dentales', value: totalPiezasDentales, icon: Smile, color: 'text-purple-400' },
    { title: 'Listo para Recoger', value: readyForPickup, icon: CheckCircle, color: 'text-primary' },
    { title: 'Entregado', value: delivered, icon: Truck, color: 'text-green-400' },
    { title: 'Pendiente de Pago', value: pendingPayment, icon: AlertCircle, color: 'text-yellow-400' },
  ];

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
    <Tabs defaultValue="home" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="home">Home</TabsTrigger>
        <TabsTrigger value="analitica">Analítica</TabsTrigger>
      </TabsList>

      <TabsContent value="home" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Vista general de órdenes</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => window.open('https://script.google.com/macros/s/AKfycbwF-dEFJO1lJsPplWf7SO5U3JwG9dTrQ4pWBTLuxS8jVokDLyeVumrCIowqkfDqUmMBQQ/exec', '_blank')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Añadir Orden
            </Button>
            <Button
              onClick={() => window.open('https://script.google.com/macros/s/AKfycbwua6870QB8Sr0BLtnjjxKTyLs2CQY2ef5M0PXOhfJ4MLWhdf0rC6XPz7Tnm3r-yfft5g/exec', '_blank')}
              className="gap-2"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
              Añadir orden sencilla
            </Button>
          </div>
        </div>

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
            <CardTitle>Últimas 20 Órdenes</CardTitle>
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
                  {latest20Orders.map((order, idx) => {
                    const timestampValue = order.Timestamp || order['Fecha de Registro'] || order.created_at;
                    const requiredDate =
                      order['Fecha Requerida'] || order.fecha_requerida || order.requiredDate;

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
      </TabsContent>

      <TabsContent value="analitica">
        <AnaliticaAdmin />
      </TabsContent>
    </Tabs>
  );
};

export default Home;
