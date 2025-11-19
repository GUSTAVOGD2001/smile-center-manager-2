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
  const [nuevoACuenta, setNuevoACuenta] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNuevoACuenta(currentACuenta.toString());
      setMetodoPago('');
    }
  }, [open, currentACuenta]);

  const calcularMotivo = (nuevoValor: number): string => {
    if (nuevoValor === costo) return 'Liquido';
    if (nuevoValor < costo) return 'Abono';
    return '';
  };

  const handleSubmit = async () => {
    const valorNumerico = parseFloat(nuevoACuenta);

    if (isNaN(valorNumerico) || valorNumerico < 0) {
      toast.error('Por favor ingrese un valor numérico válido');
      return;
    }

    if (valorNumerico > costo) {
      toast.error('El monto A Cuenta no puede ser mayor que el costo total');
      return;
    }

    if (!metodoPago) {
      toast.error('Por favor seleccione un método de pago');
      return;
    }

    const diferencia = valorNumerico - currentACuenta;

    if (diferencia === 0) {
      toast.error('El nuevo valor es igual al actual');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Actualizar A Cuenta
      await onUpdateACuenta(orderId, nuevoACuenta);

      // 2. Crear ingreso solo si hubo un incremento
      if (diferencia > 0) {
        const motivo = calcularMotivo(valorNumerico);
        const fechaActual = new Date().toISOString().split('T')[0];

        const payload = {
          apiKey: API_KEY,
          idOrden: orderId,
          fecha: fechaActual,
          monto: diferencia,
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
      }

      toast.success('A Cuenta actualizado correctamente');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al actualizar A Cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const valorNumerico = parseFloat(nuevoACuenta) || 0;
  const motivo = valorNumerico > 0 && valorNumerico <= costo ? calcularMotivo(valorNumerico) : '';
  const diferencia = valorNumerico - currentACuenta;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-[rgba(255,255,255,0.1)]">
        <DialogHeader>
          <DialogTitle>Modificar A Cuenta</DialogTitle>
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
            <Label htmlFor="nuevoACuenta">Nuevo A Cuenta *</Label>
            <Input
              id="nuevoACuenta"
              type="number"
              min="0"
              step="0.01"
              value={nuevoACuenta}
              onChange={(e) => setNuevoACuenta(e.target.value)}
              className="bg-secondary/50 border-[rgba(255,255,255,0.1)]"
              placeholder="0.00"
            />
            {valorNumerico > costo && (
              <p className="text-sm text-red-500">El monto no puede ser mayor que el costo</p>
            )}
          </div>

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

          {diferencia !== 0 && (
            <div className="grid gap-2">
              <Label>Diferencia</Label>
              <div className={`text-sm p-2 rounded ${diferencia > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
              </div>
            </div>
          )}

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
            disabled={isSubmitting || valorNumerico > costo || !metodoPago || diferencia === 0}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
