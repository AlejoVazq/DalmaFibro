import type { InvoiceStatus, OrderStatus } from "@prisma/client";

export type Step = { label: string; state: "done" | "current" | "todo" };

function build(labels: string[], currentIndex: number, allDone: boolean): Step[] {
  return labels.map((label, i) => ({
    label,
    state: allDone || i < currentIndex ? "done" : i === currentIndex ? "current" : "todo",
  }));
}

const ORDER_INDEX: Partial<Record<OrderStatus, number>> = { RECIBIDO: 0, EN_PRODUCCION: 1, LISTO: 2, PARCIAL: 3, ENTREGADO: 3 };

/** Pasos de un pedido: Recibido · En producción · Listo para retirar · Entregado. Cancelado → null. */
export function orderSteps(status: OrderStatus): Step[] | null {
  const idx = ORDER_INDEX[status];
  if (idx === undefined) return null;
  const last = status === "PARCIAL" ? "Entregado parcialmente" : "Entregado";
  return build(["Recibido", "En producción", "Listo para retirar", last], idx, status === "ENTREGADO");
}

const INVOICE_INDEX: Partial<Record<InvoiceStatus, number>> = { EMITIDO: 0, ENVIADO: 1, PAGADO: 2 };

/** Pasos de un comprobante: Emitido · Enviado a Dalmata · Pagado. Anulado → null. */
export function invoiceSteps(status: InvoiceStatus): Step[] | null {
  const idx = INVOICE_INDEX[status];
  if (idx === undefined) return null;
  return build(["Emitido", "Enviado a Dalmata", "Pagado"], idx, status === "PAGADO");
}
