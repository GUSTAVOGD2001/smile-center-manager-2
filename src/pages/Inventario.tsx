import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Package, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';
import { formatDateDMY, parseAnyDate } from '@/utils/date';

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
  const [colorFilter, setColorFilter] = useState('Todos');
  const [grosorFilter, setGrosorFilter] = useState('Todos');

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

    const dateFields: SortField[] = ['Fecha de Registro', 'Fecha Entrega', 'Fecha de Terminación'];

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (dateFields.includes(sortField)) {
        const aTime = parseAnyDate(aVal)?.getTime() ?? 0;
        const bTime = parseAnyDate(bVal)?.getTime() ?? 0;
        const comparison = aTime > bTime ? 1 : aTime < bTime ? -1 : 0;
        return sortDirection === 'asc' ? comparison : -comparison;
      }

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

  const totalNuevos = data.filter(item => item.Disco && item.Disco.trim() !== '' && item.Estado === 'Nuevo').length;
  const totalEntregados = data.filter(item => item.Disco && item.Disco.trim() !== '' && item.Estado === 'Entregado').length;
  const totalTerminados = data.filter(item => item.Disco && item.Disco.trim() !== '' && item.Estado === 'Terminado').length;
  const totalDiscos = totalNuevos + totalEntregados + totalTerminados;
  const totalRotas = data.reduce((sum, item) => {
    const rotas = typeof item['Unidades Rotas'] === 'string' 
      ? parseInt(item['Unidades Rotas']) || 0 
      : item['Unidades Rotas'] || 0;
    return sum + rotas;
  }, 0);

  const chartData = data
    .filter(item => item.Estado === 'Entregado' && item.Disco && item.Disco.trim() !== '' && item.Total > 0)
    .map(item => ({
      name: item.Disco,
      value: item.Total || 0,
    }));

  const COLORS = ['#3cb371', '#1e90ff', '#ff6b6b', '#ffd93d', '#a78bfa', '#f97316', '#ec4899', '#14b8a6'];

  const getEstadoBadge = (estado: string) => {
    if (estado === 'Nuevo') {
      return <Badge style={{ backgroundColor: '#1e90ff', color: 'white' }}>Nuevo</Badge>;
    }
    if (estado === 'Entregado') {
      return <Badge style={{ backgroundColor: '#3cb371', color: 'white' }}>Entregado</Badge>;
    }
    if (estado === 'Terminado') {
      return <Badge style={{ backgroundColor: '#f97316', color: 'white' }}>Terminado</Badge>;
    }
    return <Badge variant="outline">{estado}</Badge>;
  };

  // Parsear disco y agrupar por color y grosor
  interface ColorGrosorData {
    color: string;
    grosor: string;
    nuevo: number;
    terminado: number;
    entregado: number;
    total: number;
  }

  const datosPorColorGrosor = useMemo<ColorGrosorData[]>(() => {
    const agrupado = new Map<string, ColorGrosorData>();

    data.forEach(item => {
      if (!item.Disco || item.Disco.trim() === '') return;

      // Formato: Z-YETI-A3-16mm-1-57
      const partes = item.Disco.split('-');
      if (partes.length < 4) return;

      const color = partes[2]; // A3, B1, etc.
      const grosor = partes[3]; // 16mm, 18mm, etc.
      const key = `${color}-${grosor}`;

      if (!agrupado.has(key)) {
        agrupado.set(key, {
          color,
          grosor,
          nuevo: 0,
          terminado: 0,
          entregado: 0,
          total: 0,
        });
      }

      const grupo = agrupado.get(key)!;
      grupo.total++;

      if (item.Estado === 'Nuevo') grupo.nuevo++;
      else if (item.Estado === 'Terminado') grupo.terminado++;
      else if (item.Estado === 'Entregado') grupo.entregado++;
    });

    return Array.from(agrupado.values()).sort((a, b) => {
      const colorCompare = a.color.localeCompare(b.color);
      if (colorCompare !== 0) return colorCompare;
      return a.grosor.localeCompare(b.grosor);
    });
  }, [data]);

  // Filtrar datos de análisis
  const datosFiltradosAnalisis = useMemo(() => {
    return datosPorColorGrosor.filter(item => {
      if (colorFilter !== 'Todos' && item.color !== colorFilter) return false;
      if (grosorFilter !== 'Todos' && item.grosor !== grosorFilter) return false;
      return true;
    });
  }, [datosPorColorGrosor, colorFilter, grosorFilter]);

  // Obtener opciones únicas de color y grosor
  const coloresUnicos = useMemo(() => {
    const colores = new Set<string>();
    datosPorColorGrosor.forEach(item => colores.add(item.color));
    return Array.from(colores).sort();
  }, [datosPorColorGrosor]);

  const grosoresUnicos = useMemo(() => {
    const grosores = new Set<string>();
    datosPorColorGrosor.forEach(item => grosores.add(item.grosor));
    return Array.from(grosores).sort();
  }, [datosPorColorGrosor]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <CardTitle className="text-sm font-medium">Total Nuevos</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalNuevos}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Terminados</CardTitle>
              <CheckCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTerminados}</div>
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
              <CardTitle className="text-sm font-medium">Unidades Rotas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRotas}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="analisis" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analisis">Análisis por Color y Grosor</TabsTrigger>
            <TabsTrigger value="detalle">Detalle de Inventario</TabsTrigger>
          </TabsList>

          <TabsContent value="analisis">
            <Card className="glass-card border-[rgba(255,255,255,0.1)]">
              <CardHeader>
                <CardTitle>Análisis por Color y Grosor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6 flex-wrap">
                  <Select value={colorFilter} onValueChange={setColorFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos los colores</SelectItem>
                      {coloresUnicos.map(color => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={grosorFilter} onValueChange={setGrosorFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por grosor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos los grosores</SelectItem>
                      {grosoresUnicos.map(grosor => (
                        <SelectItem key={grosor} value={grosor}>{grosor}</SelectItem>
                      ))}
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
                          <TableHead>Color</TableHead>
                          <TableHead>Grosor</TableHead>
                          <TableHead className="text-center">Nuevos</TableHead>
                          <TableHead className="text-center">Terminados</TableHead>
                          <TableHead className="text-center">Entregados</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {datosFiltradosAnalisis.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No hay datos disponibles
                            </TableCell>
                          </TableRow>
                        ) : (
                          datosFiltradosAnalisis.map((item, index) => (
                            <TableRow key={`${item.color}-${item.grosor}`} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                              <TableCell className="font-semibold">{item.color}</TableCell>
                              <TableCell className="font-medium">{item.grosor}</TableCell>
                              <TableCell className="text-center">
                                <Badge style={{ backgroundColor: '#1e90ff', color: 'white' }}>
                                  {item.nuevo}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge style={{ backgroundColor: '#f97316', color: 'white' }}>
                                  {item.terminado}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge style={{ backgroundColor: '#3cb371', color: 'white' }}>
                                  {item.entregado}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-bold">{item.total}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detalle" className="space-y-6">
            {/* Chart */}
            <Card className="glass-card border-[rgba(255,255,255,0.1)]">
              <CardHeader>
                <CardTitle>Total de Unidades por Disco (Entregados)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

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
                      <SelectItem value="Terminado">Terminado</SelectItem>
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
                        {filteredData.filter(item => item.Disco && item.Disco.trim() !== '').map((item, index) => (
                          <TableRow key={index} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                            <TableCell>{formatDateDMY(item['Fecha de Registro'])}</TableCell>
                            <TableCell className="font-medium">{item.Disco}</TableCell>
                            <TableCell>{item.Unidades}</TableCell>
                            <TableCell>{item['Unidades Rotas']}</TableCell>
                            <TableCell className="font-semibold">{item.Total}</TableCell>
                            <TableCell>{getEstadoBadge(item.Estado)}</TableCell>
                            <TableCell>{formatDateDMY(item['Fecha Entrega'])}</TableCell>
                            <TableCell>{formatDateDMY(item['Fecha de Terminación'])}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Inventario;
