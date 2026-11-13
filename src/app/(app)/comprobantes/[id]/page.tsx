import Link from "next/link";
import { ChevronRight, Printer, Send, Wallet, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { getInvoice } from "@/domain/invoices";
import { ActionForm } from "@/components/action-form";
import { LinkButton } from "@/components/link-button";
import { NativeSelect } from "@/components/native-select";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { Stepper } from "@/components/stepper";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isoLocalDateTime } from "@/lib/format";
import { invoiceSteps } from "@/lib/steps";
import { InvoiceBody } from "../invoice-body";
import { annulInvoiceAction, markPaidAction, markSentAction, updateLineAction } from "../actions";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  const inv = await getInvoice(actor, id);
  const editable = inv.status === "EMITIDO" && can(actor, "invoices.create");
  const canChange = can(actor, "invoices.changeStatus");
  const steps = invoiceSteps(inv.status);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={`Comprobante #${inv.number}`}
        back={{ href: "/comprobantes", label: "Comprobantes" }}
        badges={<StatusBadge status={inv.status} />}
        description={
          <Link href={`/pedidos/${inv.delivery.order.id}`} className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
            Ver pedido #{inv.delivery.order.number} <ChevronRight className="size-4" aria-hidden />
          </Link>
        }
        actions={
          <LinkButton href={`/comprobantes/${inv.id}/imprimir`} variant="outline">
            <Printer aria-hidden /> Imprimir / PDF
          </LinkButton>
        }
      />

      {steps ? <Stepper steps={steps} /> : <Notice tone="error" title="Comprobante anulado">No cuenta para el saldo.</Notice>}

      {canChange && (inv.status === "EMITIDO" || inv.status === "ENVIADO") && (
        <section className="space-y-3 rounded-xl border-2 border-primary/25 bg-accent/40 p-4">
          <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">Siguiente paso</h2>
          {inv.status === "EMITIDO" ? (
            <ActionForm action={markSentAction} resetOnSuccess={false} className="space-y-3">
              <p>Revisá los importes y, cuando se lo mandes a Dalmata, marcalo como enviado.</p>
              <input type="hidden" name="invoiceId" value={inv.id} />
              <SubmitButton size="lg" className="w-full sm:w-auto">
                <Send aria-hidden /> Marcar enviado a Dalmata
              </SubmitButton>
            </ActionForm>
          ) : (
            <ActionForm action={markPaidAction} resetOnSuccess={false} className="space-y-3">
              <p>Cuando Dalmata lo pague, registrá el pago.</p>
              <input type="hidden" name="invoiceId" value={inv.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="paidAt">Fecha de pago</Label>
                  <Input id="paidAt" name="paidAt" type="datetime-local" defaultValue={isoLocalDateTime(new Date())} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paymentNote">Cómo pagó (opcional)</Label>
                  <Input id="paymentNote" name="paymentNote" placeholder="Ej.: transferencia" />
                </div>
              </div>
              <SubmitButton size="lg" className="w-full sm:w-auto">
                <Wallet aria-hidden /> Marcar pagado
              </SubmitButton>
            </ActionForm>
          )}
        </section>
      )}

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <InvoiceBody inv={inv} />
      </section>

      {editable && (
        <details className="group rounded-xl border bg-card">
          <summary className="flex h-12 cursor-pointer list-none items-center gap-2 px-4 font-medium [&::-webkit-details-marker]:hidden">
            Ajustar precio o recargo de grabado
            <ChevronRight className="ml-auto size-4 transition-transform group-open:rotate-90" aria-hidden />
          </summary>
          <div className="space-y-3 border-t p-4">
            <p className="text-sm text-muted-foreground">Solo se puede cambiar mientras no esté enviado.</p>
            {inv.lines.map((l) => (
              <ActionForm key={l.id} action={updateLineAction} resetOnSuccess={false} className="space-y-3 rounded-lg border p-3">
                <input type="hidden" name="invoiceId" value={inv.id} />
                <input type="hidden" name="lineId" value={l.id} />
                <div className="font-semibold">
                  {l.quantity} × {l.boxTypeName}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={`p_${l.id}`}>Precio por caja</Label>
                    <Input id={`p_${l.id}`} name="unitPrice" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={l.unitPrice.toString()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`m_${l.id}`}>Recargo</Label>
                    <NativeSelect id={`m_${l.id}`} name="surchargeMode" defaultValue={l.surchargeMode ?? ""}>
                      <option value="">Sin recargo</option>
                      <option value="PER_UNIT">Por caja</option>
                      <option value="TOTAL">Monto total</option>
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`v_${l.id}`}>Monto del recargo</Label>
                    <Input id={`v_${l.id}`} name="surchargeValue" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={l.surchargeValue.toString()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`r_${l.id}`}>Motivo</Label>
                    <Input id={`r_${l.id}`} name="surchargeReason" defaultValue={l.surchargeReason ?? ""} placeholder="Ej.: grabado extra en la tapa" />
                  </div>
                </div>
                <SubmitButton variant="secondary">Guardar cambios</SubmitButton>
              </ActionForm>
            ))}
          </div>
        </details>
      )}

      {inv.status !== "ANULADO" && can(actor, "records.annul") && (
        <section className="border-t pt-6">
          <ActionForm action={annulInvoiceAction} className="contents">
            <input type="hidden" name="invoiceId" value={inv.id} />
            <ConfirmSubmit
              label="Anular comprobante"
              icon={<XCircle aria-hidden />}
              question={`¿Anular el comprobante #${inv.number}? Deja de contar para el saldo.`}
              confirmLabel="Sí, anular"
            >
              <div className="space-y-1.5">
                <Label htmlFor="reason">Motivo</Label>
                <Input id="reason" name="reason" required />
              </div>
            </ConfirmSubmit>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
