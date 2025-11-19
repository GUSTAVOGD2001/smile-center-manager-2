import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintReceiptDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintReceiptDialog({ orderId, open, onOpenChange }: PrintReceiptDialogProps) {
  const handlePrint = (type: 'smilecenter' | 'dentomex') => {
    const format = type === 'dentomex' ? 'pos58_dentomex' : 'pos58';
    const url = `https://script.google.com/macros/s/AKfycbwF-dEFJO1lJsPplWf7SO5U3JwG9dTrQ4pWBTLuxS8jVokDLyeVumrCIowqkfDqUmMBQQ/exec?id=${orderId}&format=${format}`;
    window.open(url, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Imprimir Recibo</DialogTitle>
          <DialogDescription>
            Selecciona el tipo de recibo para la orden {orderId}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={() => handlePrint('smilecenter')}
            className="gap-2"
          >
            <Printer size={18} />
            SmileCenter
          </Button>
          <Button
            onClick={() => handlePrint('dentomex')}
            variant="secondary"
            className="gap-2"
          >
            <Printer size={18} />
            Dentomex
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
