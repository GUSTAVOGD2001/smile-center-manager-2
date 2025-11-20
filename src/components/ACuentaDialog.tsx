import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const API_URL_POST = "https://script.google.com/macros/s/AKfycby98jkVeS7ANZsN-44l4WuCb2mFU2S-t1uBetIjVUFiRd5HqznDpUrFgo-tTX9nmEhfqA/exec";
const API_KEY = "123tamarindo";

interface ACuentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentACuenta: number;
  costo: number;
  onSuccess: () => void;
  onUpdateACuenta: (orderId: string, newValue: string) => Promise<void>;
}

const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque'];

export const ACuentaDialog = ({ 
  open, 
  onOpenChange, 
  orderId, 
  currentACuenta, 
  costo,
  onSuccess,
  onUpdateACuenta
}: ACuentaDialogProps) => {
  const [montoAAgregar, setMontoAAgregar] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMontoAAgregar('');
      setMetodoPago('');
    }
  }, [open]);

  const calcularMotivo = (nuevoTotal: number): string => {
    if (nuevoTotal === costo) return 'Liquido';
    if (nuevoTotal < costo) return 'Abono';
    return '';
  };

  const handleSubmit = async () => {
    const montoNumerico = parseFloat(montoAAgregar);

    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      toast.error('Por favor ingrese un monto válido mayor a 0');
      return;
    }

    const nuevoTotal = currentACuenta + montoNumerico;

    if (nuevoTotal > costo) {
      toast.error('El monto total no puede ser mayor que el costo');
      return;
    }

    if (!metodoPago) {
      toast.error('Por favor seleccione un método de pago');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Crear ingreso con el monto agregado
      const motivo = calcularMotivo(nuevoTotal);
      const fechaActual = new Date().toISOString().split('T')[0];

      const payload = {
        apiKey: API_KEY,
        idOrden: orderId,
        fecha: fechaActual,
        monto: montoNumerico,
        metodoPago: metodoPago,
        motivo: motivo
      };

      const res = await fetch(API_URL_POST, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Error al crear el ingreso');
      }

      // 2. Actualizar A Cuenta con el nuevo total
      await onUpdateACuenta(orderId, nuevoTotal.toString());

      toast.success('Monto agregado correctamente');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al agregar monto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const montoNumerico = parseFloat(montoAAgregar) || 0;
  const nuevoTotal = currentACuenta + montoNumerico;
  const motivo = montoNumerico > 0 && nuevoTotal <= costo ? calcularMotivo(nuevoTotal) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-[rgba(255,255,255,0.1)]">
        <DialogHeader>
          <DialogTitle>Agregar Monto a A Cuenta</DialogTitle>
          <DialogDescription>
            Orden: {orderId} | Costo Total: ${costo.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="aCuenta">A Cuenta Actual</Label>
            <Input
              id="aCuentaActual"
              type="text"
              value={`$${currentACuenta.toFixed(2)}`}
              disabled
              className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="montoAAgregar">Monto a Agregar *</Label>
            <Input
              id="montoAAgregar"
              type="number"
              min="0.01"
              step="0.01"
              value={montoAAgregar}
              onChange={(e) => setMontoAAgregar(e.target.value)}
              className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              placeholder="0.00"
            />
            {nuevoTotal > costo && (
              <p className="text-sm text-red-500">El total excede el costo</p>
            )}
          </div>

          {montoNumerico > 0 && (
            <div className="grid gap-2">
              <Label>Nuevo Total A Cuenta</Label>
              <div className={`text-sm p-2 rounded ${nuevoTotal <= costo ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                ${currentACuenta.toFixed(2)} + ${montoNumerico.toFixed(2)} = ${nuevoTotal.toFixed(2)}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="metodoPago">Método de Pago *</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger className="bg-secondary/50 border-[rgba(255,255,255,0.1)]">
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-[rgba(255,255,255,0.1)]">
                {METODOS_PAGO.map((metodo) => (
                  <SelectItem key={metodo} value={metodo}>
                    {metodo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {motivo && (
            <div className="grid gap-2">
              <Label>Motivo (automático)</Label>
              <Input
                type="text"
                value={motivo}
                disabled
                className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || nuevoTotal > costo || !metodoPago || montoNumerico <= 0}
          >
            {isSubmitting ? 'Guardando...' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
