import type { Order, OrderStatus, Priority } from "@prisma/client";
import { prisma, type Tx } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { assertCan, type SessionUser } from "@/lib/auth/permissions";
import { MaterialsShortError, shortageFor } from "./shortage";

export type OrderLineInput = { boxTypeId: string; quantity: number; withLogo: boolean; engravingNotes?: string };
export type OrderInput = {
  priority: Priority;
  desiredDate?: Date;
  notes?: string;
  lines: OrderLineInput[];
  /** Confirmación de que ya se encargaron los herrajes que faltan. Sin esto, un faltante frena el pedido. */
  materialsOrdered?: boolean;
};

export const OPEN_STATUSES: OrderStatus[] = ["RECIBIDO", "EN_PRODUCCION", "LISTO", "PARCIAL"];
const PRIORITY_RANK: Record<Priority, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 };

const TRANSITIONS: Record<string, OrderStatus[]> = {
  RECIBIDO: ["EN_PRODUCCION"],
  EN_PRODUCCION: ["LISTO", "RECIBIDO"],
  LISTO: ["EN_PRODUCCION"],
};

async function validateLines(tx: Tx, lines: OrderLineInput[]) {
  if (lines.length === 0) throw new DomainError("EMPTY_ORDER");
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1) throw new DomainError("INVALID_QUANTITY");
  }
  const ids = [...new Set(lines.map((l) => l.boxTypeId))];
  const types = await tx.boxType.findMany({ where: { id: { in: ids } } });
  if (types.length !== ids.length || types.some((t) => !t.active)) throw new DomainError("INACTIVE_BOX_TYPE");
}

const lineData = (lines: OrderLineInput[]) =>
  lines.map((l) => ({
    boxTypeId: l.boxTypeId,
    quantity: l.quantity,
    withLogo: l.withLogo,
    engravingNotes: l.engravingNotes?.trim() || null,
  }));

/** Frena si faltan herrajes y no se marcó que están encargados; si se marcó, devuelve los datos a guardar. */
async function checkMaterials(tx: Tx, actor: SessionUser, input: OrderInput) {
  const shortage = await shortageFor(tx, input.lines);
  if (shortage.length === 0) return {};
  if (!input.materialsOrdered) throw new MaterialsShortError(shortage);
  return { materialsOrderedAt: new Date(), materialsOrderedByName: actor.name, materialsShortage: shortage };
}

/** Bloquea la fila del pedido y devuelve su estado actual. */
export async function lockOrder(tx: Tx, orderId: string): Promise<OrderStatus> {
  const rows = await tx.$queryRaw<{ status: OrderStatus }[]>`SELECT status FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  if (rows.length === 0) throw new DomainError("NOT_FOUND");
  return rows[0].status;
}

/** Estados en los que el actor puede modificar el pedido (líneas, mockups). */
export function editableStatuses(actor: SessionUser): OrderStatus[] {
  return actor.role === "DALMATA" ? ["RECIBIDO"] : ["RECIBIDO", "EN_PRODUCCION", "LISTO"];
}

function cancellableStatuses(actor: SessionUser): OrderStatus[] {
  return actor.role === "DALMATA" ? ["RECIBIDO"] : ["RECIBIDO", "EN_PRODUCCION"];
}

export async function createOrder(actor: SessionUser, input: OrderInput): Promise<Order> {
  assertCan(actor, "orders.create");
  return prisma.$transaction(async (tx) => {
    await validateLines(tx, input.lines);
    const materials = await checkMaterials(tx, actor, input);
    return tx.order.create({
      data: {
        ...materials,
        priority: input.priority,
        desiredDate: input.desiredDate,
        notes: input.notes?.trim() || null,
        createdById: actor.id,
        lines: { create: lineData(input.lines) },
      },
    });
  });
}

export async function updateOrder(actor: SessionUser, orderId: string, input: OrderInput): Promise<void> {
  assertCan(actor, "orders.edit");
  await prisma.$transaction(async (tx) => {
    const status = await lockOrder(tx, orderId);
    if (!editableStatuses(actor).includes(status)) throw new DomainError("ORDER_LOCKED");
    const delivered = await tx.delivery.count({ where: { orderId, annulledAt: null } });
    if (delivered > 0) throw new DomainError("ORDER_LOCKED");
    await validateLines(tx, input.lines);
    await tx.orderLine.deleteMany({ where: { orderId } });
    const materials = await checkMaterials(tx, actor, input);
    await tx.order.update({
      where: { id: orderId },
      data: {
        ...materials,
        priority: input.priority,
        desiredDate: input.desiredDate ?? null,
        notes: input.notes?.trim() || null,
        lines: { create: lineData(input.lines) },
      },
    });
  });
}

export async function cancelOrder(actor: SessionUser, orderId: string): Promise<void> {
  assertCan(actor, "orders.edit");
  await prisma.$transaction(async (tx) => {
    const status = await lockOrder(tx, orderId);
    if (!cancellableStatuses(actor).includes(status)) throw new DomainError("ORDER_LOCKED");
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELADO" } });
  });
}

export async function setOrderStatus(
  actor: SessionUser,
  orderId: string,
  to: "EN_PRODUCCION" | "LISTO" | "RECIBIDO",
): Promise<void> {
  assertCan(actor, "orders.changeStatus");
  await prisma.$transaction(async (tx) => {
    const status = await lockOrder(tx, orderId);
    if (!(TRANSITIONS[status] ?? []).includes(to)) throw new DomainError("INVALID_TRANSITION");
    await tx.order.update({ where: { id: orderId }, data: { status: to } });
  });
}

/** Cajas pendientes de entregar por línea (cantidad − entregas no anuladas). */
export async function getPendingByLine(orderId: string, tx: Tx = prisma): Promise<Map<string, number>> {
  const lines = await tx.orderLine.findMany({
    where: { orderId },
    include: { deliveryLines: { where: { delivery: { annulledAt: null } } } },
  });
  return new Map(lines.map((l) => [l.id, l.quantity - l.deliveryLines.reduce((s, d) => s + d.quantity, 0)]));
}

export async function recomputeOrderStatus(tx: Tx, orderId: string): Promise<OrderStatus> {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  const pending = await getPendingByLine(orderId, tx);
  const lines = await tx.orderLine.findMany({ where: { orderId } });
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const totalPending = [...pending.values()].reduce((s, n) => s + n, 0);
  let status = order.status;
  if (totalPending === 0) status = "ENTREGADO";
  else if (totalPending < totalQty) status = "PARCIAL";
  else if (status === "PARCIAL" || status === "ENTREGADO") status = "LISTO";
  if (status !== order.status) await tx.order.update({ where: { id: orderId }, data: { status } });
  return status;
}

export async function listOrders(actor: SessionUser, filters: { status?: OrderStatus[] }) {
  assertCan(actor, "orders.view");
  const orders = await prisma.order.findMany({
    where: filters.status?.length ? { status: { in: filters.status } } : {},
    include: { lines: { include: { boxType: { select: { name: true } } } }, createdBy: { select: { name: true } } },
  });
  const open = (s: OrderStatus) => (OPEN_STATUSES.includes(s) ? 0 : 1);
  return orders.sort(
    (a, b) =>
      open(a.status) - open(b.status) ||
      (open(a.status) === 0 ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] : 0) ||
      (open(a.status) === 0
        ? a.createdAt.getTime() - b.createdAt.getTime()
        : b.createdAt.getTime() - a.createdAt.getTime()),
  );
}

export async function getOrder(actor: SessionUser, orderId: string) {
  assertCan(actor, "orders.view");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      createdBy: { select: { name: true } },
      lines: { include: { boxType: true }, orderBy: { id: "asc" } },
      mockups: { orderBy: { createdAt: "asc" } },
      deliveries: {
        orderBy: { deliveredAt: "asc" },
        include: {
          lines: true,
          createdBy: { select: { name: true } },
          invoices: { select: { id: true, number: true, status: true } },
        },
      },
    },
  });
  if (!order) throw new DomainError("NOT_FOUND");
  return order;
}
