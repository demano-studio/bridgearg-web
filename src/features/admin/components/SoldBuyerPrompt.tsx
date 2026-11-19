import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type SoldBuyerValues = {
  comprador: string;
  comprador_contacto: string;
};

type Props = {
  open: boolean;
  artworkTitle: string;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (values: SoldBuyerValues) => void;
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches : false,
  );

  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}

function BuyerFields({
  name,
  contact,
  onNameChange,
  onContactChange,
  disabled,
}: {
  name: string;
  contact: string;
  onNameChange: (v: string) => void;
  onContactChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sold-buyer-name">Nombre completo</Label>
        <Input
          id="sold-buyer-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nombre y apellido"
          autoComplete="name"
          disabled={disabled}
          className="border-bridge-black/20"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sold-buyer-contact">Contacto</Label>
        <Input
          id="sold-buyer-contact"
          value={contact}
          onChange={(e) => onContactChange(e.target.value)}
          placeholder="Teléfono o email"
          autoComplete="off"
          disabled={disabled}
          className="border-bridge-black/20"
        />
      </div>
    </div>
  );
}

export function SoldBuyerPrompt({ open, artworkTitle, submitting, onOpenChange, onConfirm }: Props) {
  const isMobile = useIsMobile();
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setContact("");
      setTouched(false);
    }
  }, [open]);

  const nameOk = name.trim().length > 0;
  const contactOk = contact.trim().length > 0;
  const canSubmit = nameOk && contactOk && !submitting;

  function handleConfirm() {
    setTouched(true);
    if (!nameOk || !contactOk || submitting) return;
    onConfirm({
      comprador: name.trim(),
      comprador_contacto: contact.trim(),
    });
  }

  const errorHint =
    touched && (!nameOk || !contactOk)
      ? "Completá nombre y contacto para confirmar la venta."
      : null;

  const body = (
    <>
      <BuyerFields
        name={name}
        contact={contact}
        onNameChange={setName}
        onContactChange={setContact}
        disabled={submitting}
      />
      {errorHint ? <p className="text-sm text-destructive">{errorHint}</p> : null}
    </>
  );

  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        className="border-bridge-black/20"
        disabled={submitting}
        onClick={() => onOpenChange(false)}
      >
        Cancelar
      </Button>
      <Button type="button" className="min-h-11 flex-1 sm:flex-none" disabled={!canSubmit} onClick={handleConfirm}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Confirmar venta
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-xl border-bridge-black/20 px-5 pb-8 pt-4">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle>Registrar venta</SheetTitle>
            <SheetDescription>
              {artworkTitle} — pedimos nombre y contacto antes de marcarla como Vendida.
            </SheetDescription>
          </SheetHeader>
          {body}
          <SheetFooter className="mt-6 flex-row gap-2 sm:space-x-0">{actions}</SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-bridge-black/20">
        <DialogHeader>
          <DialogTitle>Registrar venta</DialogTitle>
          <DialogDescription>
            {artworkTitle} — pedimos nombre y contacto antes de marcarla como Vendida.
          </DialogDescription>
        </DialogHeader>
        {body}
        <DialogFooter className="gap-2 sm:gap-2">{actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Local calendar date YYYY-MM-DD for fecha_venta. */
export function todayDateIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
