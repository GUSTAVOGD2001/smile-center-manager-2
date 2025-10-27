import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Eye, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PasswordChangeDialog from '@/components/PasswordChangeDialog';

interface OrderRow {
  'ID Orden': string;
  Timestamp: string;
  Estado: string;
  Diseñadores?: string;
  Repartidores?: string;
  Nombre?: string;
  Apellido?: string;
  'Fecha Requerida'?: string;
  'Tipo de trabajo'?: string;
  Material?: string;
  'Especificación'?: string;
  ReciboURL?: string;
  [key: string]: string | undefined;
}

const DISEÑADORES = ['ITZEL', 'ALAN', 'Pendiente'];
const REPARTIDORES = ['Victor', 'ALBERTO', 'JORGE', 'Provisional', 'Pick Up', 'Pendiente'];

// Note: Replace with environment variables in production
const API_URL = 'https://script.google.com/macros/s/AKfycby0z-tq623Nxh9jTK7g9c5jXF8VQY_iqrL5IYs4J-7OGg3tUyfO7-5RZVFAtbh9KlhJMw/exec';
const API_TOKEN = 'Tamarindo123456';

const HomeSecretaria = () => {
  const { currentUser, changePassword } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    if (currentUser?.requirePasswordChange) {
      setShowPasswordChange(true);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const GET_URL = `${API_URL}?token=${API_TOKEN}`;
      const response = await fetch(GET_URL);
      const data = await response.json();
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const filteredRows = (data.rows || []).filter((order: OrderRow) => {
        const orderDate = new Date(order.Timestamp);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      });
      
      setOrders(filteredRows);
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
    
    // Format search term: if it's a number, convert to ORD-XXXX format
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

  const handleUpdateField = async (order: OrderRow, field: 'Diseñadores' | 'Repartidores', newValue: string) => {
    setIsLoading(true);
    try {
      const payload = {
        token: API_TOKEN,
        action: 'update',
        keyColumn: 'ID Orden',
        keyValue: order['ID Orden'],
        [field === 'Diseñadores' ? 'newDesigner' : 'newRepartidor']: newValue,
        debug: true
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`${field} actualizado correctamente`);
        
        // Log the change
        console.log({
          user: currentUser?.username,
          orderId: order['ID Orden'],
          field,
          oldValue: order[field],
          newValue,
          timestamp: new Date().toISOString()
        });
        
        await fetchOrders();
        handleSearch();
      } else {
        toast.error(`Error al actualizar ${field}`);
      }
    } catch (error) {
      toast.error(`Error al actualizar ${field}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (order: OrderRow, newStatus: string) => {
    setIsLoading(true);
    try {
      const UPDATE_URL = `${API_URL}?token=${API_TOKEN}`;
      const response = await fetch(UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order['ID Orden'],
          estado: newStatus,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Estado actualizado correctamente');
        
        // Log the change
        console.log({
          user: currentUser?.username,
          orderId: order['ID Orden'],
          field: 'Estado',
          oldValue: order.Estado,
          newValue: newStatus,
          timestamp: new Date().toISOString()
        });
        
        await fetchOrders();
        handleSearch();
      } else {
        toast.error('Error al actualizar el estado');
      }
    } catch (error) {
      toast.error('Error al actualizar el estado');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const showDetails = (order: OrderRow) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handlePasswordChange = (newPassword: string) => {
    changePassword(newPassword);
    setShowPasswordChange(false);
  };

  return (
    <>
      <PasswordChangeDialog 
        open={showPasswordChange} 
        onPasswordChange={handlePasswordChange}
      />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Búsqueda de Órdenes</h1>
            <p className="text-muted-foreground">Busque una orden por ID para ver y modificar Diseñadores/Repartidores</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Rol: Secretaria
          </Badge>
        </div>

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
                      <th className="text-left p-3 font-semibold">Estado Actual</th>
                      <th className="text-left p-3 font-semibold">Nuevo Estado</th>
                      <th className="text-left p-3 font-semibold">Diseñadores</th>
                      <th className="text-left p-3 font-semibold">Repartidores</th>
                      <th className="text-left p-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((order, idx) => (
                      <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-secondary/30">
                        <td className="p-3">{order['ID Orden']}</td>
                        <td className="p-3">{new Date(order.Timestamp).toLocaleString('es-ES')}</td>
                        <td className="p-3">
                          <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                            {order.Estado}
                          </span>
                        </td>
                        <td className="p-3">
                          <Select
                            defaultValue={order.Estado}
                            onValueChange={(value) => handleUpdateStatus(order, value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="w-[200px] bg-secondary/50 border-[rgba(255,255,255,0.1)]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Ingresado">Ingresado</SelectItem>
                              <SelectItem value="En Proceso">En Proceso</SelectItem>
                              <SelectItem value="Listo para recoger">Listo para recoger</SelectItem>
                              <SelectItem value="Entregado">Entregado</SelectItem>
                              <SelectItem value="Entregado-Pendiente de pago">Entregado-Pendiente de pago</SelectItem>
                              <SelectItem value="Cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Select
                            defaultValue={order.Diseñadores || 'Pendiente'}
                            onValueChange={(value) => handleUpdateField(order, 'Diseñadores', value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="w-[150px] bg-secondary/50 border-[rgba(255,255,255,0.1)]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DISEÑADORES.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Select
                            defaultValue={order.Repartidores || 'Pendiente'}
                            onValueChange={(value) => handleUpdateField(order, 'Repartidores', value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="w-[150px] bg-secondary/50 border-[rgba(255,255,255,0.1)]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REPARTIDORES.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => showDetails(order)}
                              className="gap-2"
                            >
                              <Eye size={16} />
                              Ver Detalles
                            </Button>
                            {order.ReciboURL && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(order.ReciboURL, '_blank')}
                                className="gap-2"
                              >
                                <FileText size={16} />
                                Ver Recibo
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="glass-card max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles de la Orden (Solo Lectura)</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ID Orden</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder['ID Orden']}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Estado}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Diseñadores</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Diseñadores || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Repartidores</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Repartidores || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Nombre || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Apellido || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Requerida</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder['Fecha Requerida'] || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de trabajo</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder['Tipo de trabajo'] || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Material</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder.Material || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Especificación</Label>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-[rgba(255,255,255,0.1)]">
                      {selectedOrder['Especificación'] || 'N/A'}
                    </div>
                  </div>
                </div>
                {selectedOrder.ReciboURL && (
                  <div className="mt-4">
                    <Button
                      onClick={() => {
                        if (selectedOrder.ReciboURL) {
                          window.open(selectedOrder.ReciboURL, '_blank');
                        }
                      }}
                      className="w-full gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Recibo
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default HomeSecretaria;
