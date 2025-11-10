import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, RefreshCw, ExternalLink } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Evidencia {
  'Id Evidencia': string;
  Titulo: string;
  Tipo: string;
  Fecha: string;
  Nota: string;
  'Url Imagen': string;
  [key: string]: string;
}

const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycby6KUInjAX3XF62wQz1g-SSQ9fmq9cTAjXaThF0Tn-27EzjuKRY3Or2Wj9DwqqUcuGBCw/exec?apiKey=Tamarindo123456';

const Evidencias = () => {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [filteredEvidencias, setFilteredEvidencias] = useState<Evidencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    fetchEvidencias();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [evidencias, searchTerm, fechaDesde, fechaHasta]);

  const fetchEvidencias = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching evidencias from:', WEBAPP_URL);
      const response = await fetch(WEBAPP_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Evidencias response:', data);

      if (data.ok && Array.isArray(data.data)) {
        // Ordenar por fecha más reciente primero
        const sorted = [...data.data].sort((a, b) => {
          const dateA = new Date(a.Fecha).getTime();
          const dateB = new Date(b.Fecha).getTime();
          return dateB - dateA;
        });
        setEvidencias(sorted);
        setFilteredEvidencias(sorted);
        toast.success(`${sorted.length} evidencias cargadas correctamente`);
      } else {
        console.error('Invalid data structure:', data);
        toast.error(data.error || 'No se pudieron cargar las evidencias');
        setEvidencias([]);
        setFilteredEvidencias([]);
      }
    } catch (error) {
      console.error('Error fetching evidencias:', error);
      toast.error(`Error al cargar las evidencias: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setEvidencias([]);
      setFilteredEvidencias([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...evidencias];

    // Filtro de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ev) =>
          ev.Titulo?.toLowerCase().includes(term) ||
          ev.Tipo?.toLowerCase().includes(term) ||
          ev['Id Evidencia']?.toLowerCase().includes(term)
      );
    }

    // Filtro de fechas
    if (fechaDesde) {
      const desde = new Date(fechaDesde).getTime();
      filtered = filtered.filter((ev) => {
        const evFecha = new Date(ev.Fecha).getTime();
        return evFecha >= desde;
      });
    }

    if (fechaHasta) {
      const hasta = new Date(fechaHasta).getTime();
      filtered = filtered.filter((ev) => {
        const evFecha = new Date(ev.Fecha).getTime();
        return evFecha <= hasta;
      });
    }

    setFilteredEvidencias(filtered);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando evidencias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestión de Evidencias</h1>
        <p className="text-muted-foreground">Consulta y filtra evidencias registradas</p>
      </div>

      {/* Filtros */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="search">Buscar por Título, Tipo o ID</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Buscar evidencias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                />
                <Button variant="outline" size="icon">
                  <Search size={18} />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaDesde">Desde</Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaHasta">Hasta</Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Total de evidencias: <span className="font-semibold text-foreground">{filteredEvidencias.length}</span>
            </p>
            <Button onClick={fetchEvidencias} variant="outline" className="gap-2">
              <RefreshCw size={18} />
              Actualizar lista
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Evidencias */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Lista de Evidencias</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvidencias.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No se encontraron evidencias.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[rgba(255,255,255,0.1)]">
                    <TableHead>Id Evidencia</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Carpeta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvidencias.map((ev, idx) => (
                    <TableRow key={idx} className="border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                      <TableCell className="font-medium">{ev['Id Evidencia']}</TableCell>
                      <TableCell>{ev.Titulo}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-md bg-primary/20 text-primary text-xs">
                          {ev.Tipo}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(ev.Fecha)}</TableCell>
                      <TableCell className="max-w-xs truncate">{ev.Nota}</TableCell>
                      <TableCell>
                        {ev['Url Imagen'] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(ev['Url Imagen'], '_blank')}
                            className="gap-2"
                          >
                            <ExternalLink size={16} />
                            Ver carpeta
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Evidencias;
