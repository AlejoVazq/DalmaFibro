import Link from "next/link";
import { ChevronRight, Truck } from "lucide-react";
import { can, type SessionUser } from "@/lib/auth/permissions";
import type { getOrder } from "@/domain/orders";
import { ActionForm } from "@/components/action-form";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDateTime } from "@/lib/format";
import { PICKUP_LABEL } from "@/lib/labels";
import { annulDeliveryAction } from "../delivery-actions";
import { InvoiceButton } from "./invoice-button";

type Props = {
  actor: SessionUser;
  order: Awaited<ReturnType<typeof getOrder>>;
  pending: Map<string, number>;
};

export function DeliveriesSection({ actor, order }: Props) {
  const lineName = (id: string) => order.lines.find((l) => l.id === id)?.boxType.name ?? "";

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Entregas</h2>
      {order.deliveries.length === 0 && <EmptyState icon={Truck} title="Todavía no se entregó nada" />}
      {order.deliveries.map((d) => {
        const activeInvoice = d.invoices.find((i) => i.status !== "ANULADO");
        const canInvoice = !d.annulledAt && !activeInvoice && can(actor, "invoices.create");
        const canAnnul = !d.annulledAt && !activeInvoice && can(actor, "records.annul");
        return (
          <div key={d.id} className={`space-y-3 rounded-xl border bg-card p-4 ${d.annulledAt ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{d.lines.map((l) => `${l.quantity} × ${lineName(l.orderLineId)}`).join(" · ")}</div>
                <div className="text-sm text-muted-foreground">
                  {fmtDateTime(d.deliveredAt)} · Se lo llevó: {PICKUP_LABEL[d.pickupType]} ({d.pickupName}) · Registró {d.createdBy.name}
                </div>
              </div>
              {d.annulledAt && <StatusBadge status="ANULADO" />}
            </div>
            {d.annulledAt && <p className="text-sm text-destructive">Anulada: {d.annulReason}</p>}

            {d.invoices.length > 0 && (
              <ul className="space-y-1">
                {d.invoices.map((i) => (
                  <li key={i.id}>
                    <Link href={`/comprobantes/${i.id}`} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                      <span className="flex-1 font-medium">Comprobante #{i.number}</span>
                      <StatusBadge status={i.status} />
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {(canInvoice || canAnnul) && (
              <div className="flex flex-wrap gap-2">
                {canInvoice && <InvoiceButton deliveryId={d.id} orderId={order.id} />}
                {canAnnul && (
                  <ActionForm action={annulDeliveryAction} className="contents">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="deliveryId" value={d.id} />
                    <ConfirmSubmit
                      label="Anular entrega"
                      question="¿Anular esta entrega? Se devuelven los herrajes al stock."
                      confirmLabel="Sí, anular"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor={`reason_${d.id}`}>Motivo</Label>
                        <Input id={`reason_${d.id}`} name="reason" required />
                      </div>
                    </ConfirmSubmit>
                  </ActionForm>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
