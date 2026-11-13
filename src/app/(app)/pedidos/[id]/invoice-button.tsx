import { Receipt } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { createInvoiceAction } from "@/app/(app)/comprobantes/actions";

/** Botón "Hacer comprobante" para una entrega: crea el comprobante y lleva a su detalle. */
export function InvoiceButton({ deliveryId, orderId }: { deliveryId: string; orderId: string }) {
  return (
    <ActionForm action={createInvoiceAction} resetOnSuccess={false} className="contents">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <input type="hidden" name="orderId" value={orderId} />
      <SubmitButton pendingLabel="Creando…">
        <Receipt aria-hidden /> Hacer comprobante
      </SubmitButton>
    </ActionForm>
  );
}
