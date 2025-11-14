import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, AlertCircle, Check, X, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AsistenciaRow {
  'Nombre Usuario': string;
  'Fecha del Día': string;
  'Entrada': string;
  'Salida': string;
  'Horas Trabajadas': number;
  'Hora de Retardo': number;
  'Puntualidad': boolean;
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

// Función para formatear solo fecha
function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === 'NaT') return dateStr;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

// Función para formatear fecha/hora del formato del API
function formatDateTime(dateTimeStr: string): string {
  if (!dateTimeStr || dateTimeStr === 'NaT') return dateTimeStr;
  
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}, ${hours}:${minutes}`;
  } catch {
    return dateTimeStr;
  }
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
  const [filtroPuntualidad, setFiltroPuntualidad] = useState(false);
  
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
    const filtered = asistencias.filter((row) => {
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

      // Filtro por puntualidad
      const matchesPuntualidad = filtroPuntualidad ? row['Puntualidad'] === true : true;

      return matchesNombre && matchesFecha && matchesPuntualidad;
    });

    // Ordenar por fecha más reciente primero
    return filtered.sort((a, b) => {
      const dateA = new Date(a['Entrada']);
      const dateB = new Date(b['Entrada']);
      return dateB.getTime() - dateA.getTime();
    });
  }, [asistencias, searchNombre, fechaInicio, fechaFin, filtroPuntualidad]);

  const totalHorasTrabajadas = useMemo(() => {
    return filteredData.reduce((sum, row) => sum + (Number(row['Horas Trabajadas']) || 0), 0);
  }, [filteredData]);

  const totalHorasRetardo = useMemo(() => {
    return filteredData.reduce((sum, row) => sum + (Number(row['Hora de Retardo']) || 0), 0);
  }, [filteredData]);

  // Agrupar datos por usuario para la vista semanal
  const datosPorUsuario = useMemo(() => {
    const grouped = filteredData.reduce((acc, row) => {
      const usuario = row['Nombre Usuario'];
      if (!acc[usuario]) {
        acc[usuario] = {
          nombre: usuario,
          registros: [],
          totalHoras: 0,
          totalRetardo: 0,
          diasPuntuales: 0,
          totalDias: 0,
        };
      }
      
      acc[usuario].registros.push(row);
      acc[usuario].totalHoras += Number(row['Horas Trabajadas']) || 0;
      acc[usuario].totalRetardo += Number(row['Hora de Retardo']) || 0;
      acc[usuario].totalDias += 1;
      if (row['Puntualidad']) {
        acc[usuario].diasPuntuales += 1;
      }
      
      return acc;
    }, {} as Record<string, {
      nombre: string;
      registros: AsistenciaRow[];
      totalHoras: number;
      totalRetardo: number;
      diasPuntuales: number;
      totalDias: number;
    }>);

    return Object.values(grouped).sort((a, b) => 
      a.nombre.localeCompare(b.nombre)
    );
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

      <Tabs defaultValue="registros" className="space-y-6">
        <TabsList>
          <TabsTrigger value="registros">Registros Detallados</TabsTrigger>
          <TabsTrigger value="semanal">Vista Semanal por Usuario</TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="space-y-6">

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
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="filtro-puntualidad"
              checked={filtroPuntualidad}
              onCheckedChange={setFiltroPuntualidad}
            />
            <Label htmlFor="filtro-puntualidad" className="cursor-pointer">
              Mostrar solo registros puntuales
            </Label>
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
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead className="text-center">Puntualidad</TableHead>
                  <TableHead className="text-right">Horas Trabajadas</TableHead>
                  <TableHead className="text-right">Hora de Retardo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No se encontraron registros
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row['Nombre Usuario']}</TableCell>
                      <TableCell>{formatDate(row['Fecha del Día'])}</TableCell>
                      <TableCell>{formatDateTime(row['Entrada'])}</TableCell>
                      <TableCell>
                        {row['Salida'] === 'NaT' ? (
                          <span className="text-muted-foreground italic">Pendiente</span>
                        ) : (
                          formatDateTime(row['Salida'])
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row['Puntualidad'] ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </TableCell>
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
        </TabsContent>

        <TabsContent value="semanal" className="space-y-6">
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{datosPorUsuario.length}</div>
                <p className="text-xs text-muted-foreground">
                  En el período seleccionado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promedio Horas/Usuario</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {datosPorUsuario.length > 0 
                    ? (totalHorasTrabajadas / datosPorUsuario.length).toFixed(2)
                    : '0.00'} hrs
                </div>
                <p className="text-xs text-muted-foreground">
                  Por usuario en el período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Puntualidad Promedio</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {datosPorUsuario.length > 0 
                    ? (datosPorUsuario.reduce((sum, u) => 
                        sum + (u.diasPuntuales / u.totalDias * 100), 0
                      ) / datosPorUsuario.length).toFixed(1)
                    : '0.0'}%
                </div>
                <p className="text-xs text-muted-foreground">
                  De todos los usuarios
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla semanal por usuario */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen Semanal por Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead className="text-center">Días Trabajados</TableHead>
                      <TableHead className="text-right">Total Horas</TableHead>
                      <TableHead className="text-right">Promedio Horas/Día</TableHead>
                      <TableHead className="text-right">Total Retardo</TableHead>
                      <TableHead className="text-center">Días Puntuales</TableHead>
                      <TableHead className="text-center">% Puntualidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {datosPorUsuario.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No se encontraron registros
                        </TableCell>
                      </TableRow>
                    ) : (
                      datosPorUsuario.map((usuario) => {
                        const promedioDiario = usuario.totalHoras / usuario.totalDias;
                        const porcentajePuntualidad = (usuario.diasPuntuales / usuario.totalDias) * 100;
                        
                        return (
                          <TableRow key={usuario.nombre}>
                            <TableCell className="font-medium">{usuario.nombre}</TableCell>
                            <TableCell className="text-center">{usuario.totalDias}</TableCell>
                            <TableCell className="text-right">
                              {usuario.totalHoras.toFixed(2)} hrs
                            </TableCell>
                            <TableCell className="text-right">
                              {promedioDiario.toFixed(2)} hrs
                            </TableCell>
                            <TableCell className="text-right">
                              {usuario.totalRetardo.toFixed(2)} hrs
                            </TableCell>
                            <TableCell className="text-center">
                              {usuario.diasPuntuales} / {usuario.totalDias}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                porcentajePuntualidad >= 90 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : porcentajePuntualidad >= 70
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {porcentajePuntualidad.toFixed(1)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
