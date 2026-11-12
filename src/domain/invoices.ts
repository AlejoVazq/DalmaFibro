import { Prisma, type Invoice, type InvoiceStatus, type SurchargeMode } from "@prisma/client";
import { prisma, type Tx } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { assertCan, type SessionUser } from "@/lib/auth/permissions";
import { mul, sum, toDecimal } from "@/lib/money";
import { getPriceAt } from "./catalog";

type Dec = Prisma.Decimal;

export function lineSubtotal(l: {
  unitPrice: Dec | number;
  quantity: number;
  surchargeMode: SurchargeMode | null;
  surchargeValue: Dec | number;
}): Dec {
  const base = mul(l.unitPrice, l.quantity);
  if (l.surchargeMode === "PER_UNIT") return base.add(mul(l.surchargeValue, l.quantity));
  if (l.surchargeMode === "TOTAL") return base.add(toDecimal(l.surchargeValue));
  return base;
}

async function recomputeTotal(tx: Tx, invoiceId: string): Promise<void> {
  const lines = await tx.invoiceLine.findMany({ where: { invoiceId } });
  await tx.invoice.update({ where: { id: invoiceId }, data: { total: sum(lines.map((l) => l.subtotal)) } });
}

async function lockInvoice(tx: Tx, id: string): Promise<InvoiceStatus> {
  const rows = await tx.$queryRaw<{ status: InvoiceStatus }[]>`
    SELECT status FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
  if (rows.length === 0) throw new DomainError("NOT_FOUND");
  return rows[0].status;
}

export async function createInvoiceFromDelivery(actor: SessionUser, deliveryId: string): Promise<Invoice> {
  assertCan(actor, "invoices.create");
  try {
    return await prisma.$transaction(async (tx) => {
      // Bloquea la entrega para serializar comprobantes concurrentes de la misma entrega.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Delivery" WHERE id = ${deliveryId} FOR UPDATE`;
      if (locked.length === 0) throw new DomainError("NOT_FOUND");
      const d = await tx.delivery.findUniqueOrThrow({
        where: { id: deliveryId },
        include: {
          lines: { include: { orderLine: { include: { boxType: true } } } },
          invoices: { where: { status: { not: "ANULADO" } } },
        },
      });
      if (d.annulledAt) throw new DomainError("DELIVERY_ANNULLED");
      if (d.invoices.length > 0) throw new DomainError("INVOICE_EXISTS");

      const lines = [];
      for (const l of d.lines) {
        const unitPrice = await getPriceAt(l.orderLine.boxTypeId, d.deliveredAt, tx);
        lines.push({
          orderLineId: l.orderLineId,
          boxTypeName: l.orderLine.boxType.name,
          quantity: l.quantity,
          unitPrice,
          surchargeValue: 0,
          subtotal: lineSubtotal({ unitPrice, quantity: l.quantity, surchargeMode: null, surchargeValue: 0 }),
        });
      }
      return tx.invoice.create({
        data: {
          deliveryId,
          createdById: actor.id,
          total: sum(lines.map((l) => l.subtotal)),
          lines: { create: lines },
        },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new DomainError("INVOICE_EXISTS");
    throw e;
  }
}

export type LinePatch = {
  unitPrice?: number;
  surchargeMode?: SurchargeMode | null;
  surchargeValue?: number;
  surchargeReason?: string;
};

export async function updateInvoiceLine(actor: SessionUser, lineId: string, patch: LinePatch): Promise<void> {
  assertCan(actor, "invoices.create");
  await prisma.$transaction(async (tx) => {
    const found = await tx.invoiceLine.findUnique({ where: { id: lineId } });
    if (!found) throw new DomainError("NOT_FOUND");
    const status = await lockInvoice(tx, found.invoiceId);
    if (status !== "EMITIDO") throw new DomainError("INVOICE_LOCKED");
    const line = await tx.invoiceLine.findUniqueOrThrow({ where: { id: lineId } });

    const unitPrice = patch.unitPrice !== undefined ? toDecimal(patch.unitPrice) : line.unitPrice;
    const surchargeMode = patch.surchargeMode !== undefined ? patch.surchargeMode : line.surchargeMode;
    let surchargeValue = patch.surchargeValue !== undefined ? toDecimal(patch.surchargeValue) : line.surchargeValue;
    let surchargeReason =
      patch.surchargeReason !== undefined ? patch.surchargeReason.trim() || null : line.surchargeReason;
    if (patch.unitPrice !== undefined && !(Number.isFinite(patch.unitPrice) && patch.unitPrice >= 0))
      throw new DomainError("INVALID_INPUT");
    if (patch.surchargeValue !== undefined && !(Number.isFinite(patch.surchargeValue) && patch.surchargeValue >= 0))
      throw new DomainError("INVALID_INPUT");
    if (!surchargeMode) {
      surchargeValue = toDecimal(0);
      surchargeReason = null;
    } else if (surchargeValue.gt(0) && !surchargeReason) {
      throw new DomainError("SURCHARGE_REASON_REQUIRED");
    }

    await tx.invoiceLine.update({
      where: { id: lineId },
      data: {
        unitPrice,
        surchargeMode,
        surchargeValue,
        surchargeReason,
        subtotal: lineSubtotal({ unitPrice, quantity: line.quantity, surchargeMode, surchargeValue }),
      },
    });
    await recomputeTotal(tx, line.invoiceId);
  });
}

export async function markInvoiceSent(actor: SessionUser, id: string): Promise<void> {
  assertCan(actor, "invoices.changeStatus");
  await prisma.$transaction(async (tx) => {
    if ((await lockInvoice(tx, id)) !== "EMITIDO") throw new DomainError("INVALID_TRANSITION");
    await tx.invoice.update({ where: { id }, data: { status: "ENVIADO", sentAt: new Date() } });
  });
}

export async function markInvoicePaid(
  actor: SessionUser,
  id: string,
  input: { paidAt: Date; paymentNote?: string },
): Promise<void> {
  assertCan(actor, "invoices.changeStatus");
  if (Number.isNaN(input.paidAt.getTime())) throw new DomainError("INVALID_INPUT");
  await prisma.$transaction(async (tx) => {
    if ((await lockInvoice(tx, id)) !== "ENVIADO") throw new DomainError("INVALID_TRANSITION");
    await tx.invoice.update({
      where: { id },
      data: { status: "PAGADO", paidAt: input.paidAt, paymentNote: input.paymentNote?.trim() || null },
    });
  });
}

export async function annulInvoice(actor: SessionUser, id: string, reason: string): Promise<void> {
  assertCan(actor, "records.annul");
  if (!reason.trim()) throw new DomainError("REASON_REQUIRED");
  await prisma.$transaction(async (tx) => {
    if ((await lockInvoice(tx, id)) === "ANULADO") throw new DomainError("ALREADY_ANNULLED");
    await tx.invoice.update({
      where: { id },
      data: { status: "ANULADO", annulledAt: new Date(), annulReason: reason.trim() },
    });
  });
}

export type InvoiceFilters = { status?: InvoiceStatus; from?: Date; to?: Date };

export async function listInvoices(actor: SessionUser, filters: InvoiceFilters) {
  assertCan(actor, "invoices.view");
  return prisma.invoice.findMany({
    where: {
      status: filters.status,
      issuedAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
    },
    include: { delivery: { include: { order: { select: { id: true, number: true } } } } },
    orderBy: { number: "desc" },
  });
}

export async function getInvoice(actor: SessionUser, id: string) {
  assertCan(actor, "invoices.view");
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      lines: { include: { orderLine: { select: { withLogo: true, engravingNotes: true } } }, orderBy: { id: "asc" } },
      delivery: { include: { order: { select: { id: true, number: true } } } },
      createdBy: { select: { name: true } },
    },
  });
  if (!inv) throw new DomainError("NOT_FOUND");
  return inv;
}

const DAY_MS = 86_400_000;

export async function getAccountBalance(actor: SessionUser) {
  assertCan(actor, "invoices.view");
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "ANULADO" } },
    orderBy: { issuedAt: "asc" },
    select: { id: true, number: true, issuedAt: true, total: true, status: true },
  });
  const issued = sum(invoices.map((i) => i.total));
  const paid = sum(invoices.filter((i) => i.status === "PAGADO").map((i) => i.total));
  const now = Date.now();
  const unpaid = invoices
    .filter((i) => i.status === "EMITIDO" || i.status === "ENVIADO")
    .map((i) => ({ ...i, daysOld: Math.floor((now - i.issuedAt.getTime()) / DAY_MS) }));
  return { issued, paid, owed: issued.sub(paid), unpaid };
}
