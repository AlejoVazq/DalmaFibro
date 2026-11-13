import type { Delivery, Location, PickupType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { assertCan, type SessionUser } from "@/lib/auth/permissions";
import { getPendingByLine, lockOrder, recomputeOrderStatus } from "./orders";
import { createMovements, getBalances, type MovementRow } from "./stock";

const DELIVERABLE = ["EN_PRODUCCION", "LISTO", "PARCIAL"];

export type DeliveryInput = {
  orderId: string;
  requestId: string;
  deliveredAt: Date;
  pickupType: PickupType;
  pickupName: string;
  lines?: { orderLineId: string; quantity: number }[];
};

export async function registerDelivery(
  actor: SessionUser,
  input: DeliveryInput,
): Promise<{ delivery: Delivery; negativeStock: string[] }> {
  assertCan(actor, "deliveries.create");
  const pickupName = input.pickupName.trim();
  if (!pickupName) throw new DomainError("PICKUP_NAME_REQUIRED");
  if (!input.requestId) throw new DomainError("INVALID_INPUT");
  if (Number.isNaN(input.deliveredAt.getTime())) throw new DomainError("INVALID_INPUT");

  return prisma.$transaction(async (tx) => {
    const status = await lockOrder(tx, input.orderId);

    // Idempotencia: un reintento con el mismo requestId devuelve la entrega ya creada.
    const existing = await tx.delivery.findUnique({ where: { requestId: input.requestId } });
    if (existing) return { delivery: existing, negativeStock: [] };

    if (!DELIVERABLE.includes(status)) throw new DomainError("ORDER_NOT_DELIVERABLE");

    const pending = await getPendingByLine(input.orderId, tx);
    const requested = input.lines ?? [...pending.entries()].map(([orderLineId, quantity]) => ({ orderLineId, quantity }));
    const lines = requested.filter((l) => l.quantity !== 0);
    for (const l of lines) {
      if (!pending.has(l.orderLineId)) throw new DomainError("NOT_FOUND");
      if (!Number.isInteger(l.quantity) || l.quantity < 0) throw new DomainError("INVALID_QUANTITY");
      if (l.quantity > pending.get(l.orderLineId)!) throw new DomainError("OVER_DELIVERY");
    }
    if (lines.length === 0) throw new DomainError("EMPTY_DELIVERY");

    const delivery = await tx.delivery.create({
      data: {
        orderId: input.orderId,
        requestId: input.requestId,
        deliveredAt: input.deliveredAt,
        pickupType: input.pickupType,
        pickupName,
        createdById: actor.id,
        lines: { create: lines },
      },
    });

    // Consumo de herrajes: Σ cajas entregadas × receta, un movimiento por material.
    const orderLines = await tx.orderLine.findMany({
      where: { id: { in: lines.map((l) => l.orderLineId) } },
      include: { boxType: { include: { recipe: true } } },
    });
    const consumption = new Map<string, number>();
    for (const l of lines) {
      const ol = orderLines.find((x) => x.id === l.orderLineId)!;
      for (const r of ol.boxType.recipe) {
        consumption.set(r.materialId, (consumption.get(r.materialId) ?? 0) + l.quantity * r.qtyPerBox);
      }
    }
    // Placas MDF negro: por tipo de caja, cajas ÷ cajas por placa, redondeando para arriba.
    const byType = new Map<string, { qty: number; perPlate: number }>();
    for (const l of lines) {
      const bt = orderLines.find((x) => x.id === l.orderLineId)!.boxType;
      if (!bt.boxesPerBlackPlate) continue;
      const cur = byType.get(bt.id) ?? { qty: 0, perPlate: bt.boxesPerBlackPlate };
      byType.set(bt.id, { ...cur, qty: cur.qty + l.quantity });
    }
    if (byType.size > 0) {
      const plate = await tx.material.findUniqueOrThrow({ where: { code: "PLACA_MDF_NEGRO" } });
      const plates = [...byType.values()].reduce((s, t) => s + Math.ceil(t.qty / t.perPlate), 0);
      if (plates > 0) consumption.set(plate.id, plates);
    }
    const rows: MovementRow[] = [...consumption.entries()].map(([materialId, qty]) => ({
      materialId,
      location: "TALLER" as Location,
      type: "CONSUMO",
      quantity: -qty,
      orderId: input.orderId,
      deliveryId: delivery.id,
      createdById: actor.id,
    }));
    await createMovements(tx, rows);
    await recomputeOrderStatus(tx, input.orderId);

    const balances = await getBalances(tx);
    const negativeStock = balances
      .filter((b) => consumption.has(b.materialId) && b.taller < 0)
      .map((b) => b.name);
    return { delivery, negativeStock };
  });
}

export async function annulDelivery(actor: SessionUser, deliveryId: string, reason: string): Promise<void> {
  assertCan(actor, "records.annul");
  if (!reason.trim()) throw new DomainError("REASON_REQUIRED");
  await prisma.$transaction(async (tx) => {
    const d = await tx.delivery.findUnique({ where: { id: deliveryId } });
    if (!d) throw new DomainError("NOT_FOUND");
    await lockOrder(tx, d.orderId);
    const fresh = await tx.delivery.findUniqueOrThrow({
      where: { id: deliveryId },
      include: { invoices: { where: { status: { not: "ANULADO" } } }, movements: { where: { type: "CONSUMO" } } },
    });
    if (fresh.annulledAt) throw new DomainError("ALREADY_ANNULLED");
    if (fresh.invoices.length > 0) throw new DomainError("HAS_ACTIVE_INVOICE");
    await createMovements(
      tx,
      fresh.movements.map((m) => ({
        materialId: m.materialId,
        location: m.location,
        type: "REVERSION",
        quantity: -m.quantity,
        orderId: m.orderId,
        deliveryId: m.deliveryId,
        reversesId: m.id,
        note: `Anulación de entrega: ${reason.trim()}`,
        createdById: actor.id,
      })),
    );
    await tx.delivery.update({
      where: { id: deliveryId },
      data: { annulledAt: new Date(), annulReason: reason.trim(), annulledById: actor.id },
    });
    await recomputeOrderStatus(tx, d.orderId);
  });
}
