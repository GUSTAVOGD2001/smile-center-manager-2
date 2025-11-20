import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

interface FresadoRow {
  'ID Orden': string;
  M?: string;
  I?: string;
  C?: string;
  N?: string;
  '3/4'?: string;
  Disco?: string;
  FR?: string;
  Dx?: string;
  Unidades?: string;
  'C.R'?: string;
  'Rep x. unidad'?: string;
  'Motivo de la rep'?: string;
  'Codigo de fresado'?: string;
  Material?: string;
  [key: string]: string | undefined;
}

const HistorialFresados = () => {
  const [fresados, setFresados] = useState<FresadoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterIdOrden, setFilterIdOrden] = useState('');
  const [filterDisco, setFilterDisco] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');

  useEffect(() => {
    fetchFresados();
  }, []);

  const fetchFresados = async () => {
    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbxeNTiBOeTTuhMaPzZ9oMVQ3JlzeYEaCqjygo_0JpEIwdNd4bn3ZwhJXSvBTSzjwihIkA/exec');
      const data = await response.json();
      setFresados(data.rows || []);
    } catch (error) {
      toast.error('Error al cargar el historial de fresados');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTipoTrabajo = (row: FresadoRow): string => {
    const tipos: string[] = [];
    
    if (row.M?.toLowerCase() === 'm') tipos.push('Corona Monolítica');
    if (row.I?.toLowerCase() === 'i') tipos.push('Incrustación');
    if (row.C?.toLowerCase() === 'c') tipos.push('Carilla');
    if (row.N?.toLowerCase() === 'n') tipos.push('Núcleo');
    if (row['3/4']?.toLowerCase() === '3/4') tipos.push('3/4');
    
    return tipos.join(', ') || '-';
  };

  const filteredFresados = fresados.filter((row) => {
    const matchIdOrden = filterIdOrden === '' || row['ID Orden']?.toLowerCase().includes(filterIdOrden.toLowerCase());
    const matchDisco = filterDisco === '' || row.Disco?.toLowerCase().includes(filterDisco.toLowerCase());
    const matchMaterial = filterMaterial === '' || row.Material?.toLowerCase().includes(filterMaterial.toLowerCase());
    
    return matchIdOrden && matchDisco && matchMaterial;
  });

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
        <h1 className="text-3xl font-bold mb-2">Historial de Fresados</h1>
        <p className="text-muted-foreground">Registro completo de fresados realizados</p>
      </div>

      {/* Filtros */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">ID Orden</label>
              <Input
                placeholder="Buscar por ID..."
                value={filterIdOrden}
                onChange={(e) => setFilterIdOrden(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Disco</label>
              <Input
                placeholder="Filtrar por disco..."
                value={filterDisco}
                onChange={(e) => setFilterDisco(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Material</label>
              <Input
                placeholder="Filtrar por material..."
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Registros ({filteredFresados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Orden</TableHead>
                  <TableHead>Tipo de Trabajo</TableHead>
                  <TableHead>Disco</TableHead>
                  <TableHead>N. Fresadora</TableHead>
                  <TableHead>Dx</TableHead>
                  <TableHead>Unidades</TableHead>
                  <TableHead>C.R</TableHead>
                  <TableHead>Rep x. Unidad</TableHead>
                  <TableHead>Motivo de la Rep</TableHead>
                  <TableHead>Código de Fresado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFresados.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row['ID Orden'] || '-'}</TableCell>
                    <TableCell>{getTipoTrabajo(row)}</TableCell>
                    <TableCell>{row.Disco || '-'}</TableCell>
                    <TableCell>{row.FR || '-'}</TableCell>
                    <TableCell>{row.Dx || '-'}</TableCell>
                    <TableCell>{row.Unidades || '-'}</TableCell>
                    <TableCell>{row['C.R'] || '-'}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={row['Rep x. unidad']?.toLowerCase() === 'true' || row['Rep x. unidad']?.toLowerCase() === 'yes'}
                        disabled
                      />
                    </TableCell>
                    <TableCell>{row['Motivo de la rep'] || '-'}</TableCell>
                    <TableCell>{row['Codigo de fresado'] || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistorialFresados;
