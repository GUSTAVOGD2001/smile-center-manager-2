import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AsistenciaRow {
  'Nombre Usuario': string;
  'Fecha del Día': string;
  'Hora de Entrada': string;
  'Hora de Salida': string;
  'Horas Trabajadas': number;
  'Hora de Retardo': number;
}

const ASISTENCIA_API_URL = 'https://script.google.com/macros/s/AKfycbyT3rhKLRVU16QyKwWdbxvZfjucqZJJOX5Ex91l0lFgcbQsYSGZAK84-HDrF-zBAMAc/exec?apiKey=TamarindoAsistencia';

// Función para obtener el lunes de la semana actual
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

// Función para obtener el sábado de la semana actual
function getSaturdayOfWeek(date: Date): Date {
  const monday = getMondayOfWeek(date);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return saturday;
}

// Función para formatear fecha a YYYY-MM-DD
function formatDateToInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Función para parsear fecha del formato del API
function parseDateFromAPI(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Intenta parsear diferentes formatos
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  // Si viene en formato DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(`${year}-${month}-${day}`);
  }
  
  return null;
}

export default function Asistencia() {
  const [asistencias, setAsistencias] = useState<AsistenciaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchNombre, setSearchNombre] = useState('');
  
  const today = new Date();
  const mondayDefault = getMondayOfWeek(today);
  const saturdayDefault = getSaturdayOfWeek(today);
  
  const [fechaInicio, setFechaInicio] = useState(formatDateToInput(mondayDefault));
  const [fechaFin, setFechaFin] = useState(formatDateToInput(saturdayDefault));

  useEffect(() => {
    fetchAsistencias();
  }, []);

  async function fetchAsistencias() {
    setLoading(true);
    try {
      const response = await fetch(ASISTENCIA_API_URL);
      if (!response.ok) {
        throw new Error('Error al obtener datos de asistencia');
      }
      const data = await response.json();
      
      if (data.ok && Array.isArray(data.rows)) {
        setAsistencias(data.rows);
      } else {
        throw new Error('Formato de datos inesperado');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos de asistencia');
      setAsistencias([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredData = useMemo(() => {
    return asistencias.filter((row) => {
      // Filtro por nombre
      const matchesNombre = row['Nombre Usuario']
        ?.toLowerCase()
        .includes(searchNombre.toLowerCase());

      // Filtro por rango de fechas
      const rowDate = parseDateFromAPI(row['Fecha del Día']);
      if (!rowDate) return matchesNombre;

      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      
      // Normalizar las fechas para comparar solo día/mes/año
      rowDate.setHours(0, 0, 0, 0);
      inicio.setHours(0, 0, 0, 0);
      fin.setHours(0, 0, 0, 0);

      const matchesFecha = rowDate >= inicio && rowDate <= fin;

      return matchesNombre && matchesFecha;
    });
  }, [asistencias, searchNombre, fechaInicio, fechaFin]);

  const totalHorasTrabajadas = useMemo(() => {
    return filteredData.reduce((sum, row) => sum + (Number(row['Horas Trabajadas']) || 0), 0);
  }, [filteredData]);

  const totalHorasRetardo = useMemo(() => {
    return filteredData.reduce((sum, row) => sum + (Number(row['Hora de Retardo']) || 0), 0);
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando datos de asistencia...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Asistencia</h1>
        <p className="text-muted-foreground">
          Consulta y filtra registros de asistencia del personal
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
              <Input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha-fin">Fecha Fin</Label>
              <Input
                id="fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-nombre">Buscar por Nombre</Label>
              <Input
                id="search-nombre"
                type="text"
                placeholder="Nombre del usuario..."
                value={searchNombre}
                onChange={(e) => setSearchNombre(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Horas Trabajadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHorasTrabajadas.toFixed(2)} hrs</div>
            <p className="text-xs text-muted-foreground">
              En el período seleccionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Horas de Retardo</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHorasRetardo.toFixed(2)} hrs</div>
            <p className="text-xs text-muted-foreground">
              En el período seleccionado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de datos */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Asistencia ({filteredData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Usuario</TableHead>
                  <TableHead>Fecha del Día</TableHead>
                  <TableHead>Hora de Entrada</TableHead>
                  <TableHead>Hora de Salida</TableHead>
                  <TableHead className="text-right">Horas Trabajadas</TableHead>
                  <TableHead className="text-right">Hora de Retardo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No se encontraron registros
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row['Nombre Usuario']}</TableCell>
                      <TableCell>{row['Fecha del Día']}</TableCell>
                      <TableCell>{row['Hora de Entrada']}</TableCell>
                      <TableCell>{row['Hora de Salida']}</TableCell>
                      <TableCell className="text-right">
                        {Number(row['Horas Trabajadas']).toFixed(2)} hrs
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(row['Hora de Retardo']).toFixed(2)} hrs
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
