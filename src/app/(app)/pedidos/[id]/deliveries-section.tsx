import Link from "next/link";
import { can, type SessionUser } from "@/lib/auth/permissions";
import type { getOrder } from "@/domain/orders";
import { ActionForm } from "@/components/action-form";
import { LinkButton } from "@/components/link-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDateTime } from "@/lib/format";
import { PICKUP_LABEL } from "@/lib/labels";
import { annulDeliveryAction } from "../delivery-actions";
import { InvoiceButton } from "./invoice-button";

type Props = {
  actor: SessionUser;
  order: Awaited<ReturnType<typeof getOrder>>;
  pending: Map<string, number>;
};

export function DeliveriesSection({ actor, order, pending }: Props) {
  const anyPending = [...pending.values()].some((n) => n > 0);
  const deliverable = ["EN_PRODUCCION", "LISTO", "PARCIAL"].includes(order.status) && anyPending;
  const lineName = (id: string) => order.lines.find((l) => l.id === id)?.boxType.name ?? "";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Entregas</h2>
        {deliverable && can(actor, "deliveries.create") && (
          <LinkButton href={`/pedidos/${order.id}/entregar`}>Registrar entrega</LinkButton>
        )}
      </div>
      {order.deliveries.length === 0 && <p className="text-sm text-muted-foreground">Todavía no se entregó nada.</p>}
      {order.deliveries.map((d) => {
        const activeInvoice = d.invoices.find((i) => i.status !== "ANULADO");
        return (
          <div key={d.id} className={`border rounded-md p-3 space-y-2 text-sm ${d.annulledAt ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="font-medium">{fmtDateTime(d.deliveredAt)}</span>
              <span>
                {PICKUP_LABEL[d.pickupType]}: {d.pickupName}
              </span>
              <span className="text-muted-foreground">Registró {d.createdBy.name}</span>
              {d.annulledAt && <span className="text-red-700">Anulada: {d.annulReason}</span>}
            </div>
            <div>{d.lines.map((l) => `${l.quantity} × ${lineName(l.orderLineId)}`).join(" · ")}</div>
            <div className="flex flex-wrap gap-2 items-center">
              {d.invoices.map((i) => (
                <Link key={i.id} href={`/comprobantes/${i.id}`} className="hover:underline flex items-center gap-1">
                  Comprobante #{i.number} <StatusBadge status={i.status} />
                </Link>
              ))}
              {!d.annulledAt && !activeInvoice && can(actor, "invoices.create") && <InvoiceButton deliveryId={d.id} orderId={order.id} />}
              {!d.annulledAt && can(actor, "records.annul") && !activeInvoice && (
                <ActionForm action={annulDeliveryAction} className="flex gap-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="deliveryId" value={d.id} />
                  <Input name="reason" placeholder="Motivo de anulación" required className="w-48 h-8" />
                  <Button type="submit" size="sm" variant="destructive">
                    Anular entrega
                  </Button>
                </ActionForm>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
