import { randomUUID } from "node:crypto";
import type { Discard, Location, Material, MaterialKind, Prisma } from "@prisma/client";
import { prisma, type Tx } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { assertCan, type SessionUser } from "@/lib/auth/permissions";
import type { MaterialCode } from "@/lib/materials";

export type MovementRow = Prisma.StockMovementUncheckedCreateInput;

function checkQty(q: number) {
  if (!Number.isInteger(q) || q <= 0) throw new DomainError("INVALID_QUANTITY");
}

async function materialOfKind(tx: Tx, code: MaterialCode, kind: MaterialKind): Promise<Material> {
  const m = await tx.material.findUnique({ where: { code } });
  if (!m || m.kind !== kind) throw new DomainError(kind === "HERRAJE" ? "NOT_HARDWARE" : "NOT_PLATE");
  return m;
}

/** Inserta movimientos dentro de una transacción existente. Uso interno (entregas, anulaciones). */
export async function createMovements(tx: Tx, rows: MovementRow[]): Promise<void> {
  if (rows.length) await tx.stockMovement.createMany({ data: rows });
}

export async function registerIngreso(
  actor: SessionUser,
  input: { materialCode: MaterialCode; quantity: number; note?: string },
): Promise<void> {
  assertCan(actor, "stock.move");
  checkQty(input.quantity);
  const m = await materialOfKind(prisma, input.materialCode, "HERRAJE");
  await prisma.stockMovement.create({
    data: {
      materialId: m.id,
      location: "TALLER",
      type: "INGRESO",
      quantity: input.quantity,
      note: input.note,
      createdById: actor.id,
    },
  });
}

export async function registerDiscard(
  actor: SessionUser,
  input: { items: { materialCode: MaterialCode; quantity: number }[]; note?: string; orderId?: string },
): Promise<Discard> {
  assertCan(actor, "stock.move");
  const items = input.items.filter((i) => i.quantity !== 0);
  if (items.length === 0) throw new DomainError("EMPTY_DISCARD");
  items.forEach((i) => checkQty(i.quantity));
  return prisma.$transaction(async (tx) => {
    const mats: Material[] = [];
    for (const i of items) mats.push(await materialOfKind(tx, i.materialCode, "HERRAJE"));
    const discard = await tx.discard.create({
      data: { note: input.note, orderId: input.orderId, createdById: actor.id },
    });
    await createMovements(
      tx,
      items.map((i, idx) => ({
        materialId: mats[idx].id,
        location: "TALLER" as Location,
        type: "DESCARTE" as const,
        quantity: -i.quantity,
        discardId: discard.id,
        orderId: input.orderId,
        note: input.note,
        createdById: actor.id,
      })),
    );
    return discard;
  });
}

export async function registerAdjustment(
  actor: SessionUser,
  input: { materialCode: MaterialCode; location: Location; delta: number; reason: string },
): Promise<void> {
  assertCan(actor, "stock.move");
  if (!input.reason.trim()) throw new DomainError("REASON_REQUIRED");
  if (!Number.isInteger(input.delta) || input.delta === 0) throw new DomainError("INVALID_QUANTITY");
  const m = await prisma.material.findUnique({ where: { code: input.materialCode } });
  if (!m) throw new DomainError("NOT_FOUND");
  if (m.kind === "HERRAJE" && input.location !== "TALLER") throw new DomainError("INVALID_INPUT");
  await prisma.stockMovement.create({
    data: {
      materialId: m.id,
      location: input.location,
      type: "AJUSTE",
      quantity: input.delta,
      note: input.reason.trim(),
      createdById: actor.id,
    },
  });
}

export async function registerPlateArrival(
  actor: SessionUser,
  input: { materialCode: MaterialCode; quantity: number; note?: string },
): Promise<void> {
  assertCan(actor, "stock.registerArrival");
  checkQty(input.quantity);
  const m = await materialOfKind(prisma, input.materialCode, "PLACA");
  await prisma.stockMovement.create({
    data: {
      materialId: m.id,
      location: "DALMATA",
      type: "LLEGADA_PLACA",
      quantity: input.quantity,
      note: input.note,
      createdById: actor.id,
    },
  });
}

export async function registerPlatePickup(
  actor: SessionUser,
  input: { materialCode: MaterialCode; quantity: number; note?: string },
): Promise<void> {
  assertCan(actor, "stock.move");
  checkQty(input.quantity);
  const m = await materialOfKind(prisma, input.materialCode, "PLACA");
  const group = randomUUID();
  const base = { materialId: m.id, type: "RETIRO_PLACA" as const, note: input.note, transferGroupId: group, createdById: actor.id };
  await prisma.stockMovement.createMany({
    data: [
      { ...base, location: "DALMATA", quantity: -input.quantity },
      { ...base, location: "TALLER", quantity: input.quantity },
    ],
  });
}

export async function registerPlateUse(
  actor: SessionUser,
  input: { materialCode: MaterialCode; quantity: number; note?: string },
): Promise<void> {
  assertCan(actor, "stock.move");
  checkQty(input.quantity);
  const m = await materialOfKind(prisma, input.materialCode, "PLACA");
  await prisma.stockMovement.create({
    data: {
      materialId: m.id,
      location: "TALLER",
      type: "USO_PLACA",
      quantity: -input.quantity,
      note: input.note,
      createdById: actor.id,
    },
  });
}

export type Balance = {
  materialId: string;
  code: MaterialCode;
  name: string;
  unit: string;
  kind: MaterialKind;
  taller: number;
  dalmata: number;
};

export async function getBalances(tx: Tx = prisma): Promise<Balance[]> {
  const [materials, sums] = await Promise.all([
    tx.material.findMany({ orderBy: { code: "asc" } }),
    tx.stockMovement.groupBy({ by: ["materialId", "location"], _sum: { quantity: true } }),
  ]);
  const get = (id: string, loc: Location) =>
    sums.find((s) => s.materialId === id && s.location === loc)?._sum.quantity ?? 0;
  return materials.map((m) => ({
    materialId: m.id,
    code: m.code as MaterialCode,
    name: m.name,
    unit: m.unit,
    kind: m.kind,
    taller: get(m.id, "TALLER"),
    dalmata: get(m.id, "DALMATA"),
  }));
}

export async function listMovements(
  actor: SessionUser,
  filters: { from?: Date; to?: Date; materialCode?: MaterialCode; take?: number; skip?: number },
) {
  assertCan(actor, "stock.view");
  const where: Prisma.StockMovementWhereInput = {
    createdAt: { gte: filters.from, lte: filters.to },
    material: filters.materialCode ? { code: filters.materialCode } : undefined,
  };
  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters.take ?? 50,
      skip: filters.skip ?? 0,
      include: {
        material: true,
        createdBy: { select: { name: true } },
        order: { select: { number: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);
  return { items, total };
}
