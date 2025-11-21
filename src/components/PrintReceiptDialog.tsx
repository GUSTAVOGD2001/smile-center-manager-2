import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, Receipt } from "lucide-react";

interface PrintReceiptDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReceiptType = 'completo' | 'sencillo' | null;

export function PrintReceiptDialog({ orderId, open, onOpenChange }: PrintReceiptDialogProps) {
  const [receiptType, setReceiptType] = useState<ReceiptType>(null);

  const handleReset = () => {
    setReceiptType(null);
  };

  const handlePrint = (brand: 'smilecenter' | 'dentomex') => {
    let url: string;
    
    if (receiptType === 'completo') {
      const format = brand === 'dentomex' ? 'pos58_dentomex' : 'pos58';
      url = `https://script.google.com/macros/s/AKfycbwF-dEFJO1lJsPplWf7SO5U3JwG9dTrQ4pWBTLuxS8jVokDLyeVumrCIowqkfDqUmMBQQ/exec?id=${orderId}&format=${format}`;
    } else {
      url = `https://script.google.com/macros/s/AKfycbwF-dEFJO1lJsPplWf7SO5U3JwG9dTrQ4pWBTLuxS8jVokDLyeVumrCIowqkfDqUmMBQQ/exec?id=${orderId}&format=simple&brand=${brand}`;
    }
    
    window.open(url, '_blank');
    onOpenChange(false);
    handleReset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleReset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Imprimir Recibo</DialogTitle>
          <DialogDescription>
            {receiptType === null 
              ? `Selecciona el tipo de recibo para la orden ${orderId}`
              : `Selecciona la marca para el recibo ${receiptType}`
            }
          </DialogDescription>
        </DialogHeader>
        
        {receiptType === null ? (
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => setReceiptType('completo')}
              className="gap-2"
            >
              <FileText size={18} />
              Recibo Completo
            </Button>
            <Button
              onClick={() => setReceiptType('sencillo')}
              variant="secondary"
              className="gap-2"
            >
              <Receipt size={18} />
              Recibo Sencillo
            </Button>
          </div>
        ) : (
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
            <Button
              onClick={handleReset}
              variant="outline"
              className="gap-2 mt-2"
            >
              Atrás
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
