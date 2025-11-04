import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

interface OrderRow {
  'ID Orden': string;
  'Tipo de trabajo'?: string;
  Material?: string;
  'Piezas Dentales'?: number;
  Diseñadores?: string;
  [key: string]: string | number | undefined;
}

const API_URL = 'https://script.google.com/macros/s/AKfycby0z-tq623Nxh9jTK7g9c5jXF8VQY_iqrL5IYs4J-7OGg3tUyfO7-5RZVFAtbh9KlhJMw/exec';
const API_TOKEN = 'Tamarindo123456';

const TIPOS_TRABAJO = [
  'Corona monolítica',
  'Incrustación',
  'Núcleo',
  'Puente Maryland',
  'Puente California',
  'Carilla',
  'Escaneo',
  'Corona',
  'Puente',
  'Inyección',
  'Implante',
  'Abudment',
  'Calcinable',
  '3/4 Cutback',
  'Vaneer'
];

const MATERIALES = [
  'Zirconia opaca',
  'Zirconia estándar',
  'Zirconia traslúcida',
  'Cera',
  'Disilicato',
  'Signum',
  'Inyección',
  'Metalica',
  'PMMA',
  'Impresión 3D',
  'Metal-porcelana'
];

const Analitica = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]);
  const [selectedMateriales, setSelectedMateriales] = useState<string[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const GET_URL = `${API_URL}?token=${API_TOKEN}`;
      const response = await fetch(GET_URL);
      const data = await response.json();

      const sourceRows = Array.isArray(data?.rows) ? (data.rows as OrderRow[]) : [];
      setOrders(sourceRows);
    } catch (error) {
      toast.error('Error al cargar las órdenes');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTipo = (tipo: string) => {
    setSelectedTipos(prev =>
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    );
  };

  const toggleMaterial = (material: string) => {
    setSelectedMateriales(prev =>
      prev.includes(material) ? prev.filter(m => m !== material) : [...prev, material]
    );
  };

  // Filter orders based on selected filters
  const filteredOrders = orders.filter(order => {
    const tipoMatch = selectedTipos.length === 0 || 
      selectedTipos.some(tipo => order['Tipo de trabajo']?.includes(tipo));
    const materialMatch = selectedMateriales.length === 0 || 
      selectedMateriales.some(material => order.Material?.includes(material));
    return tipoMatch && materialMatch;
  });

  // Calculate frequency for Tipo de trabajo
  const tipoFrequency = TIPOS_TRABAJO.reduce((acc, tipo) => {
    const count = filteredOrders.filter(order => 
      order['Tipo de trabajo']?.includes(tipo)
    ).length;
    if (count > 0) {
      acc[tipo] = count;
    }
    return acc;
  }, {} as Record<string, number>);

  // Calculate frequency for Material
  const materialFrequency = MATERIALES.reduce((acc, material) => {
    const count = filteredOrders.filter(order => 
      order.Material?.includes(material)
    ).length;
    if (count > 0) {
      acc[material] = count;
    }
    return acc;
  }, {} as Record<string, number>);

  // Calculate total milled units (Piezas Dentales)
  const totalUnidadesFresadas = filteredOrders.reduce((sum, order) => {
    const piezas = typeof order['Piezas Dentales'] === 'number' ? order['Piezas Dentales'] : 0;
    return sum + piezas;
  }, 0);

  // Calculate units per designer
  const designerData = filteredOrders.reduce((acc, order) => {
    const designer = order.Diseñadores || 'Sin asignar';
    const piezas = typeof order['Piezas Dentales'] === 'number' ? order['Piezas Dentales'] : 0;
    
    if (!acc[designer]) {
      acc[designer] = 0;
    }
    acc[designer] += piezas;
    return acc;
  }, {} as Record<string, number>);

  const designerChartData = Object.entries(designerData).map(([name, units]) => ({
    name,
    units
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando analítica...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analítica</h1>
          <p className="text-muted-foreground">Análisis de órdenes por tipo de trabajo, material y diseñador</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tipo de trabajo filter */}
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Tipo de trabajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
              {TIPOS_TRABAJO.map(tipo => (
                <div key={tipo} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tipo-${tipo}`}
                    checked={selectedTipos.includes(tipo)}
                    onCheckedChange={() => toggleTipo(tipo)}
                  />
                  <Label 
                    htmlFor={`tipo-${tipo}`}
                    className="text-sm cursor-pointer"
                  >
                    {tipo}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Material filter */}
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Material</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
              {MATERIALES.map(material => (
                <div key={material} className="flex items-center space-x-2">
                  <Checkbox
                    id={`material-${material}`}
                    checked={selectedMateriales.includes(material)}
                    onCheckedChange={() => toggleMaterial(material)}
                  />
                  <Label 
                    htmlFor={`material-${material}`}
                    className="text-sm cursor-pointer"
                  >
                    {material}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Frequency of Tipo de trabajo */}
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Frecuencia de Tipo de Trabajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(tipoFrequency).length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay datos</p>
              ) : (
                Object.entries(tipoFrequency)
                  .sort(([, a], [, b]) => b - a)
                  .map(([tipo, count]) => (
                    <div key={tipo} className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm">{tipo}</span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Frequency of Material */}
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Frecuencia de Material</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(materialFrequency).length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay datos</p>
              ) : (
                Object.entries(materialFrequency)
                  .sort(([, a], [, b]) => b - a)
                  .map(([material, count]) => (
                    <div key={material} className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm">{material}</span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Milled Units */}
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Unidades Fresadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-5xl font-bold text-primary">{totalUnidadesFresadas}</p>
              <p className="text-sm text-muted-foreground mt-2">Total de piezas dentales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart - Units per Designer */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Unidades por Diseñador</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              units: {
                label: "Unidades",
                color: "hsl(var(--primary))",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={designerChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="units" 
                  fill="hsl(var(--primary))" 
                  radius={[8, 8, 0, 0]}
                  name="Unidades"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analitica;
