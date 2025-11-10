import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Upload, FileImage } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { uploadEvidenceWithFiles, uploadEvidenceWithUrls } from '@/lib/uploadEvidence';

interface OrderRow {
  'ID Orden': string;
  Timestamp: string;
  Estado: string;
  Nombre?: string;
  Apellido?: string;
  [key: string]: string | undefined;
}

const HomeDiseñadores = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<OrderRow[]>([]);
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('');
  const [fecha, setFecha] = useState('');
  const [nota, setNota] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

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
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast.error('Ingrese un ID de orden para buscar');
      return;
    }
    
    let formattedSearchTerm = searchTerm.trim();
    if (/^\d+$/.test(formattedSearchTerm)) {
      const orderNumber = formattedSearchTerm.padStart(4, '0');
      formattedSearchTerm = `ORD-${orderNumber}`;
    }
    
    const results = orders.filter(order => 
      order['ID Orden']?.toLowerCase().includes(formattedSearchTerm.toLowerCase())
    );
    setSearchResults(results);
    if (results.length === 0) {
      toast.info('No se encontraron órdenes');
    }
  };

  const handleSubmitEvidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo || !tipo || !fecha) {
      toast.error('Complete los campos obligatorios: Título, Tipo y Fecha');
      return;
    }

    setIsSaving(true);
    setStatusMessage('Guardando…');

    try {
      const payload = {
        apiKey: 'Tamarindo123456',
        action: 'evidencias.create' as const,
        titulo,
        tipo,
        fecha,
        nota,
      };

      const filesInput = document.getElementById('file-input') as HTMLInputElement | null;
      const pickedFiles = filesInput?.files
        ? Array.from(filesInput.files)
        : files
        ? Array.from(files)
        : [];

      console.log('Files to upload:', pickedFiles.length);
      console.log('Files details:', pickedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));

      const data = await uploadEvidenceWithFiles(payload, pickedFiles);

      if (data?.debug) {
        console.log('DEBUG Evidencias:', data.debug);
      }

      if (data.ok) {
        const evidenciaId = data.id || data.idEvidencia || 'N/A';
        setStatusMessage(`Evidencia creada correctamente: ${evidenciaId}`);
        toast.success(`Evidencia ${evidenciaId} creada correctamente`);
        
        // Limpiar formulario
        setTitulo('');
        setTipo('');
        setFecha('');
        setNota('');
        setFiles(null);
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setStatusMessage('Error al guardar evidencia.');
        toast.error(data.error || 'Error al guardar evidencia');
      }
    } catch (error) {
      console.error(error);
      setStatusMessage('Error al guardar evidencia.');
      toast.error('Error al guardar evidencia');
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Panel de Diseñador</h1>
          <p className="text-muted-foreground">Búsqueda de órdenes y registro de evidencias</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Rol: Diseñador - {currentUser?.username}
        </Badge>
      </div>

      {/* Búsqueda de Órdenes */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Buscar Orden</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Ingrese el ID de la orden"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              />
            </div>
            <Button onClick={handleSearch} className="gap-2">
              <Search size={18} />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados de búsqueda */}
      {searchResults.length > 0 && (
        <Card className="glass-card border-[rgba(255,255,255,0.1)]">
          <CardHeader>
            <CardTitle>Resultados de Búsqueda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.1)]">
                    <th className="text-left p-3 font-semibold">ID Orden</th>
                    <th className="text-left p-3 font-semibold">Timestamp</th>
                    <th className="text-left p-3 font-semibold">Cliente</th>
                    <th className="text-left p-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((order, idx) => (
                    <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                      <td className="p-3">{order['ID Orden']}</td>
                      <td className="p-3">{new Date(order.Timestamp).toLocaleString('es-ES')}</td>
                      <td className="p-3">{order.Nombre} {order.Apellido}</td>
                      <td className="p-3">
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                          {order.Estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario de Registro de Evidencia */}
      <Card className="glass-card border-[rgba(255,255,255,0.1)]">
        <CardHeader>
          <CardTitle>Registrar Evidencia</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitEvidencia} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título de la evidencia"
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={tipo} onValueChange={setTipo} required>
                  <SelectTrigger className="bg-secondary/50 border-[rgba(255,255,255,0.1)]">
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="Operación">Operación</SelectItem>
                    <SelectItem value="Seguridad">Seguridad</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-input">Imágenes</Label>
                <div className="relative">
                  <Input
                    id="file-input"
                    type="file"
                    name="files"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(e.target.files)}
                    className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
                  />
                  <FileImage className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nota">Nota</Label>
              <Textarea
                id="nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Escriba sus observaciones..."
                className="bg-secondary/50 border-[rgba(255,255,255,0.1)] min-h-[120px]"
              />
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Upload size={18} />
                {isSaving ? 'Guardando…' : 'Guardar Evidencia'}
              </Button>
              {statusMessage && (
                <p className={`text-sm ${statusMessage.includes('correctamente') ? 'text-green-400' : statusMessage.includes('Error') ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {statusMessage}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomeDiseñadores;
