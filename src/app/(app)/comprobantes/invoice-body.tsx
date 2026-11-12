import type { getInvoice } from "@/domain/invoices";
import { fmtDate, fmtDateTime, fmtMoney } from "@/lib/format";
import { PICKUP_LABEL } from "@/lib/labels";

type Inv = Awaited<ReturnType<typeof getInvoice>>;

export function surchargeText(l: Inv["lines"][number]): string {
  if (!l.surchargeMode || l.surchargeValue.isZero()) return "—";
  const v = l.surchargeMode === "PER_UNIT" ? `${fmtMoney(l.surchargeValue)} c/u` : fmtMoney(l.surchargeValue);
  return l.surchargeReason ? `${v} (${l.surchargeReason})` : v;
}

/** Datos del comprobante (cabecera + tabla de líneas), compartido entre el detalle y la vista para imprimir. */
export function InvoiceBody({ inv }: { inv: Inv }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Fecha de emisión</dt>
        <dd>{fmtDate(inv.issuedAt)}</dd>
        <dt className="text-muted-foreground">Pedido</dt>
        <dd>#{inv.delivery.order.number}</dd>
        <dt className="text-muted-foreground">Despacho</dt>
        <dd>
          {fmtDateTime(inv.delivery.deliveredAt)} — {PICKUP_LABEL[inv.delivery.pickupType]}: {inv.delivery.pickupName}
        </dd>
        {inv.sentAt && (
          <>
            <dt className="text-muted-foreground">Enviado</dt>
            <dd>{fmtDate(inv.sentAt)}</dd>
          </>
        )}
        {inv.paidAt && (
          <>
            <dt className="text-muted-foreground">Pagado</dt>
            <dd>
              {fmtDate(inv.paidAt)}
              {inv.paymentNote ? ` — ${inv.paymentNote}` : ""}
            </dd>
          </>
        )}
        {inv.annulledAt && (
          <>
            <dt className="text-muted-foreground">Anulado</dt>
            <dd className="text-red-700">
              {fmtDate(inv.annulledAt)} — {inv.annulReason}
            </dd>
          </>
        )}
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2">Tipo de caja</th>
              <th className="py-2 pr-2">Logo</th>
              <th className="py-2 pr-2 text-right">Cantidad</th>
              <th className="py-2 pr-2 text-right">Precio unit.</th>
              <th className="py-2 pr-2">Recargo grabado</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id} className="border-b align-top">
                <td className="py-2 pr-2">{l.boxTypeName}</td>
                <td className="py-2 pr-2">{l.orderLine.withLogo ? "Sí" : "No"}</td>
                <td className="py-2 pr-2 text-right">{l.quantity}</td>
                <td className="py-2 pr-2 text-right">{fmtMoney(l.unitPrice)}</td>
                <td className="py-2 pr-2">{surchargeText(l)}</td>
                <td className="py-2 text-right">{fmtMoney(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="py-2 pr-2 text-right font-semibold">
                Total
              </td>
              <td className="py-2 text-right font-semibold">{fmtMoney(inv.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
