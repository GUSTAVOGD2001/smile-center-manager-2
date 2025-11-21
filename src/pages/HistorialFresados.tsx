import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface FresadoRow {
  'ID Orden': string;
  Fecha?: string;
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

interface OrderRow {
  'ID Orden': string;
  Costo?: string;
  'A Cuenta'?: string;
  'Piezas Dentales'?: string;
  [key: string]: string | undefined;
}

const HistorialFresados = () => {
  const [fresados, setFresados] = useState<FresadoRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterIdOrden, setFilterIdOrden] = useState('');
  const [filterDisco, setFilterDisco] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterTipoTrabajo, setFilterTipoTrabajo] = useState('');
  const [openDisco, setOpenDisco] = useState(false);
  const [openMaterial, setOpenMaterial] = useState(false);
  const [openTipoTrabajo, setOpenTipoTrabajo] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchFresados(), fetchOrders()]);
  };

  const fetchFresados = async () => {
    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbxeNTiBOeTTuhMaPzZ9oMVQ3JlzeYEaCqjygo_0JpEIwdNd4bn3ZwhJXSvBTSzjwihIkA/exec');
      const data = await response.json();
      const rowsData = Array.isArray(data) ? data : (data.rows || []);
      setFresados(rowsData);
    } catch (error) {
      toast.error('Error al cargar el historial de fresados');
      console.error('Error fetching fresados:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycby0z-tq623Nxh9jTK7g9c5jXF8VQY_iqrL5IYs4J-7OGg3tUyfO7-5RZVFAtbh9KlhJMw/exec?token=Tamarindo123456');
      const data = await response.json();
      setOrders(data.rows || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
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

  const getMaterial = (disco?: string): string => {
    if (!disco) return '-';
    const firstChar = disco.charAt(0).toUpperCase();
    if (firstChar === 'Z') return 'Zirconia';
    if (firstChar === 'P') return 'PMMA';
    if (firstChar === 'W') return 'Cera';
    return '-';
  };

  const enrichFresadoWithOrderData = (fresado: FresadoRow): FresadoRow & { Costo?: string; 'A Cuenta'?: string; 'Piezas Dentales'?: string } => {
    const order = orders.find(o => o['ID Orden'] === fresado['ID Orden']);
    return {
      ...fresado,
      Costo: order?.Costo || '-',
      'A Cuenta': order?.['A Cuenta'] || '-',
      'Piezas Dentales': order?.['Piezas Dentales'] || '-',
    };
  };

  const getUniqueDiscos = () => {
    const discos = new Set<string>();
    fresados.forEach(f => {
      if (f.Disco) discos.add(f.Disco);
    });
    return Array.from(discos).sort();
  };

  const getUniqueMaterials = () => {
    const materials = new Set<string>();
    fresados.forEach(f => {
      const material = getMaterial(f.Disco);
      if (material !== '-') materials.add(material);
    });
    return Array.from(materials).sort();
  };

  const getUniqueTiposTrabajo = () => {
    const tipos = new Set<string>();
    fresados.forEach(f => {
      const tipo = getTipoTrabajo(f);
      if (tipo !== '-') {
        tipo.split(', ').forEach(t => tipos.add(t));
      }
    });
    return Array.from(tipos).sort();
  };

  const filteredFresados = fresados.map(enrichFresadoWithOrderData).filter((row) => {
    const matchIdOrden = filterIdOrden === '' || row['ID Orden']?.toLowerCase().includes(filterIdOrden.toLowerCase());
    const matchDisco = filterDisco === '' || row.Disco === filterDisco;
    const material = getMaterial(row.Disco);
    const matchMaterial = filterMaterial === '' || material === filterMaterial;
    const tipoTrabajo = getTipoTrabajo(row);
    const matchTipoTrabajo = filterTipoTrabajo === '' || tipoTrabajo.includes(filterTipoTrabajo);
    
    return matchIdOrden && matchDisco && matchMaterial && matchTipoTrabajo;
  });

  const ordenesNoFresadas = orders.filter(order => {
    return !fresados.some(f => f['ID Orden'] === order['ID Orden']);
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

      <Tabs defaultValue="fresados" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fresados">Fresados ({filteredFresados.length})</TabsTrigger>
          <TabsTrigger value="no-fresadas">Órdenes no fresadas ({ordenesNoFresadas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fresados" className="space-y-6">
          {/* Filtros */}
          <Card className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">ID Orden</label>
                  <Input
                    placeholder="Buscar por ID..."
                    value={filterIdOrden}
                    onChange={(e) => setFilterIdOrden(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Trabajo</label>
                  <Popover open={openTipoTrabajo} onOpenChange={setOpenTipoTrabajo}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openTipoTrabajo}
                        className="w-full justify-between"
                      >
                        {filterTipoTrabajo || "Seleccionar..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar tipo..." />
                        <CommandEmpty>No se encontró.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value=""
                            onSelect={() => {
                              setFilterTipoTrabajo('');
                              setOpenTipoTrabajo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterTipoTrabajo === '' ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Todos
                          </CommandItem>
                          {getUniqueTiposTrabajo().map((tipo) => (
                            <CommandItem
                              key={tipo}
                              value={tipo}
                              onSelect={(currentValue) => {
                                setFilterTipoTrabajo(currentValue === filterTipoTrabajo ? '' : currentValue);
                                setOpenTipoTrabajo(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filterTipoTrabajo === tipo ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {tipo}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Material</label>
                  <Popover open={openMaterial} onOpenChange={setOpenMaterial}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openMaterial}
                        className="w-full justify-between"
                      >
                        {filterMaterial || "Seleccionar..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar material..." />
                        <CommandEmpty>No se encontró.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value=""
                            onSelect={() => {
                              setFilterMaterial('');
                              setOpenMaterial(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterMaterial === '' ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Todos
                          </CommandItem>
                          {getUniqueMaterials().map((material) => (
                            <CommandItem
                              key={material}
                              value={material}
                              onSelect={(currentValue) => {
                                setFilterMaterial(currentValue === filterMaterial ? '' : currentValue);
                                setOpenMaterial(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filterMaterial === material ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {material}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Disco</label>
                  <Popover open={openDisco} onOpenChange={setOpenDisco}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDisco}
                        className="w-full justify-between"
                      >
                        {filterDisco || "Seleccionar..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar disco..." />
                        <CommandEmpty>No se encontró.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value=""
                            onSelect={() => {
                              setFilterDisco('');
                              setOpenDisco(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterDisco === '' ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Todos
                          </CommandItem>
                          {getUniqueDiscos().map((disco) => (
                            <CommandItem
                              key={disco}
                              value={disco}
                              onSelect={(currentValue) => {
                                setFilterDisco(currentValue === filterDisco ? '' : currentValue);
                                setOpenDisco(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filterDisco === disco ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {disco}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Fresados */}
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
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo de Trabajo</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Disco</TableHead>
                      <TableHead>N. Fresadora</TableHead>
                      <TableHead>Dx</TableHead>
                      <TableHead>Unidades</TableHead>
                      <TableHead>Piezas Dentales</TableHead>
                      <TableHead>C.R</TableHead>
                      <TableHead>Costo</TableHead>
                      <TableHead>A Cuenta</TableHead>
                      <TableHead>Rep x. Unidad</TableHead>
                      <TableHead>Motivo de la Rep</TableHead>
                      <TableHead>Código de Fresado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFresados.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row['ID Orden'] || '-'}</TableCell>
                        <TableCell>{row.Fecha || '-'}</TableCell>
                        <TableCell>{getTipoTrabajo(row)}</TableCell>
                        <TableCell>{getMaterial(row.Disco)}</TableCell>
                        <TableCell>{row.Disco || '-'}</TableCell>
                        <TableCell>{row.FR || '-'}</TableCell>
                        <TableCell>{row.Dx || '-'}</TableCell>
                        <TableCell>{row.Unidades || '-'}</TableCell>
                        <TableCell>{row['Piezas Dentales'] || '-'}</TableCell>
                        <TableCell>{row['C.R'] || '-'}</TableCell>
                        <TableCell>${row.Costo || '0'}</TableCell>
                        <TableCell>${row['A Cuenta'] || '0'}</TableCell>
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
        </TabsContent>

        <TabsContent value="no-fresadas" className="space-y-6">
          <Card className="glass-card border-[rgba(255,255,255,0.1)]">
            <CardHeader>
              <CardTitle>Órdenes no fresadas ({ordenesNoFresadas.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Orden</TableHead>
                      <TableHead>Costo</TableHead>
                      <TableHead>A Cuenta</TableHead>
                      <TableHead>Piezas Dentales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenesNoFresadas.map((order, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{order['ID Orden']}</TableCell>
                        <TableCell>${order.Costo || '0'}</TableCell>
                        <TableCell>${order['A Cuenta'] || '0'}</TableCell>
                        <TableCell>{order['Piezas Dentales'] || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistorialFresados;
