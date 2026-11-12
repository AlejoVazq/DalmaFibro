import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { createInvoiceAction } from "@/app/(app)/comprobantes/actions";

/** Botón "Hacer comprobante" para una entrega: crea el comprobante y lleva a su detalle. */
export function InvoiceButton({ deliveryId, orderId }: { deliveryId: string; orderId: string }) {
  return (
    <ActionForm action={createInvoiceAction} resetOnSuccess={false}>
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" size="sm">
        Hacer comprobante
      </Button>
    </ActionForm>
  );
}
