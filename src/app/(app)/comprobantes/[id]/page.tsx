import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { getInvoice } from "@/domain/invoices";
import { ActionForm } from "@/components/action-form";
import { LinkButton } from "@/components/link-button";
import { NativeSelect } from "@/components/native-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isoLocalDateTime } from "@/lib/format";
import { InvoiceBody } from "../invoice-body";
import { annulInvoiceAction, markPaidAction, markSentAction, updateLineAction } from "../actions";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  const inv = await getInvoice(actor, id);
  const editable = inv.status === "EMITIDO" && can(actor, "invoices.create");

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/comprobantes" className="text-sm hover:underline">
        ← Comprobantes
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Comprobante #{inv.number}</h1>
        <StatusBadge status={inv.status} />
        <Link href={`/pedidos/${inv.delivery.order.id}`} className="text-sm hover:underline">
          Ver pedido #{inv.delivery.order.number}
        </Link>
        <LinkButton href={`/comprobantes/${inv.id}/imprimir`} variant="outline" className="ml-auto">
          Imprimir / PDF
        </LinkButton>
      </div>

      <InvoiceBody inv={inv} />

      {editable && (
        <section className="space-y-3">
          <h2 className="font-semibold">Ajustar precio o recargo de grabado</h2>
          {inv.lines.map((l) => (
            <ActionForm key={l.id} action={updateLineAction} resetOnSuccess={false} className="border rounded-md p-3 space-y-2">
              <input type="hidden" name="invoiceId" value={inv.id} />
              <input type="hidden" name="lineId" value={l.id} />
              <div className="font-medium text-sm">
                {l.boxTypeName} × {l.quantity}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`p_${l.id}`}>Precio unitario</Label>
                  <Input id={`p_${l.id}`} name="unitPrice" type="number" step="0.01" min="0" defaultValue={l.unitPrice.toString()} className="w-32" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`m_${l.id}`}>Recargo</Label>
                  <NativeSelect id={`m_${l.id}`} name="surchargeMode" defaultValue={l.surchargeMode ?? ""} className="w-40">
                    <option value="">Sin recargo</option>
                    <option value="PER_UNIT">Por caja</option>
                    <option value="TOTAL">Monto total</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`v_${l.id}`}>Monto</Label>
                  <Input id={`v_${l.id}`} name="surchargeValue" type="number" step="0.01" min="0" defaultValue={l.surchargeValue.toString()} className="w-28" />
                </div>
                <div className="space-y-1 flex-1 min-w-48">
                  <Label htmlFor={`r_${l.id}`}>Motivo</Label>
                  <Input id={`r_${l.id}`} name="surchargeReason" defaultValue={l.surchargeReason ?? ""} placeholder="Ej.: grabado extra en la tapa" />
                </div>
                <Button type="submit" size="sm">
                  Guardar
                </Button>
              </div>
            </ActionForm>
          ))}
        </section>
      )}

      <section className="flex flex-wrap gap-4 items-start">
        {inv.status === "EMITIDO" && can(actor, "invoices.changeStatus") && (
          <ActionForm action={markSentAction} resetOnSuccess={false}>
            <input type="hidden" name="invoiceId" value={inv.id} />
            <Button type="submit">Marcar enviado a Dalmata</Button>
          </ActionForm>
        )}
        {inv.status === "ENVIADO" && can(actor, "invoices.changeStatus") && (
          <ActionForm action={markPaidAction} resetOnSuccess={false} className="border rounded-md p-3 space-y-2">
            <div className="font-medium text-sm">Registrar pago</div>
            <input type="hidden" name="invoiceId" value={inv.id} />
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="paidAt">Fecha de pago</Label>
                <Input id="paidAt" name="paidAt" type="datetime-local" defaultValue={isoLocalDateTime(new Date())} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="paymentNote">Nota</Label>
                <Input id="paymentNote" name="paymentNote" placeholder="Ej.: transferencia" />
              </div>
              <Button type="submit">Marcar pagado</Button>
            </div>
          </ActionForm>
        )}
        {inv.status !== "ANULADO" && can(actor, "records.annul") && (
          <ActionForm action={annulInvoiceAction} className="flex flex-wrap gap-2 items-start">
            <input type="hidden" name="invoiceId" value={inv.id} />
            <Input name="reason" placeholder="Motivo de anulación" required className="w-56" />
            <Button type="submit" variant="destructive">
              Anular comprobante
            </Button>
          </ActionForm>
        )}
      </section>
    </div>
  );
}
