import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateDMY } from '@/utils/date';

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
  const [categoriaFilter, setCategoriaFilter] = useState<string>('Todas');
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

  const filteredGastos = categoriaFilter === 'Todas' 
    ? gastos 
    : gastos.filter(g => g.Categoria === categoriaFilter);

  const totalGastos = filteredGastos.reduce((sum, g) => sum + (parseFloat(String(g['Monto de Gasto'])) || 0), 0);
  const gastoPromedio = filteredGastos.length > 0 ? totalGastos / filteredGastos.length : 0;
  
  // Get current month's gastos
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const gastosMesActual = gastos.filter(g => {
    const gastoDate = new Date(g.Fecha);
    return gastoDate.getMonth() === currentMonth && gastoDate.getFullYear() === currentYear;
  });
  const totalMesActual = gastosMesActual.reduce((sum, g) => sum + (parseFloat(String(g['Monto de Gasto'])) || 0), 0);

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
            <div className="text-3xl font-bold">${totalGastos.toFixed(2)}</div>
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
            <div className="text-3xl font-bold">${gastoPromedio.toFixed(2)}</div>
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
            <div className="text-3xl font-bold">${totalMesActual.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {gastosMesActual.length} gastos este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="filter-categoria">Filtrar por categoría:</Label>
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
