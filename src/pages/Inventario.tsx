import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Package, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';

interface InventoryItem {
  'Fecha de Registro': string;
  'Disco': string;
  'Unidades': number;
  'Unidades Rotas': number;
  'Total': number;
  'Estado': string;
  'Fecha Entrega': string;
  'Fecha de Terminación': string;
}

type SortField = keyof InventoryItem;
type SortDirection = 'asc' | 'desc';

const Inventario = () => {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [sortField, setSortField] = useState<SortField>('Fecha de Registro');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const API_URL = 'https://script.google.com/macros/s/AKfycby0z-tq623Nxh9jTK7g9c5jXF8VQY_iqrL5IYs4J-7OGg3tUyfO7-5RZVFAtbh9KlhJMw/exec?token=Tamarindo123456&source=inventory';

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Error al cargar inventario');
      const result = await response.json();
      setData(result.rows || []);
      toast({ title: 'Inventario actualizado', description: 'Datos cargados exitosamente' });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({ title: 'Error', description: 'No se pudo cargar el inventario', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    const interval = setInterval(fetchInventory, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = [...data];

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.Disco.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Estado.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (estadoFilter !== 'Todos') {
      filtered = filtered.filter(item => item.Estado === estadoFilter);
    }

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredData(filtered);
  }, [data, searchTerm, estadoFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const totalDiscos = data.reduce((sum, item) => sum + (item.Total || 0), 0);
  const totalEntregados = data.filter(item => item.Estado === 'Entregado').length;
  const totalNuevos = data.filter(item => item.Estado === 'Nuevo').length;
  const totalRotas = data.reduce((sum, item) => sum + (item['Unidades Rotas'] || 0), 0);

  const chartData = data.reduce((acc, item) => {
    const existing = acc.find(d => d.disco === item.Disco);
    if (existing) {
      if (item.Estado === 'Nuevo') existing.nuevos += item.Total || 0;
      if (item.Estado === 'Entregado') existing.entregados += item.Total || 0;
    } else {
      acc.push({
        disco: item.Disco,
        nuevos: item.Estado === 'Nuevo' ? item.Total || 0 : 0,
        entregados: item.Estado === 'Entregado' ? item.Total || 0 : 0,
      });
    }
    return acc;
  }, [] as Array<{ disco: string; nuevos: number; entregados: number }>);

  const getEstadoBadge = (estado: string) => {
    if (estado === 'Nuevo') {
      return <Badge style={{ backgroundColor: '#1e90ff', color: 'white' }}>Nuevo</Badge>;
    }
    if (estado === 'Entregado') {
      return <Badge style={{ backgroundColor: '#3cb371', color: 'white' }}>Entregado</Badge>;
    }
    return <Badge variant="outline">{estado}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">📦 Dashboard de Inventario de Discos de Zirconia</h1>
          <Button onClick={fetchInventory} disabled={isLoading} variant="outline" size="icon">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Discos</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDiscos}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Entregados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEntregados}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Nuevos</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalNuevos}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unidades Rotas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRotas}</div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Total de Unidades por Disco</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="disco" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="nuevos" fill="#1e90ff" name="Nuevos" />
                <Bar dataKey="entregados" fill="#3cb371" name="Entregados" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Inventario de Discos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6 flex-wrap">
              <Input
                placeholder="Buscar por disco o estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Nuevo">Nuevos</SelectItem>
                  <SelectItem value="Entregado">Entregados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="rounded-md border border-[rgba(255,255,255,0.1)] overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      {['Fecha de Registro', 'Disco', 'Unidades', 'Unidades Rotas', 'Total', 'Estado', 'Fecha Entrega', 'Fecha de Terminación'].map((header) => (
                        <TableHead
                          key={header}
                          className="cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort(header as SortField)}
                        >
                          {header} {sortField === header && (sortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, index) => (
                      <TableRow key={index} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                        <TableCell>{item['Fecha de Registro']}</TableCell>
                        <TableCell className="font-medium">{item.Disco}</TableCell>
                        <TableCell>{item.Unidades}</TableCell>
                        <TableCell>{item['Unidades Rotas']}</TableCell>
                        <TableCell className="font-semibold">{item.Total}</TableCell>
                        <TableCell>{getEstadoBadge(item.Estado)}</TableCell>
                        <TableCell>{item['Fecha Entrega']}</TableCell>
                        <TableCell>{item['Fecha de Terminación']}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Inventario;
