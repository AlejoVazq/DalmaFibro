import type { BoxType, Prisma } from "@prisma/client";
import { prisma, type Tx } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { assertCan, type SessionUser } from "@/lib/auth/permissions";
import type { MaterialCode } from "@/lib/materials";

export type Recipe = Partial<Record<MaterialCode, number>>;

export const DEFAULT_RECIPE: Recipe = { TORNILLO: 12, BISAGRA: 2, CIERRE_A: 1 };

/** El primer precio de un tipo de caja rige hacia atrás: así una entrega con fecha anterior al alta del tipo igual tiene precio. */
const INITIAL_PRICE_FROM = new Date("2000-01-01T00:00:00-03:00");

async function writeRecipe(tx: Tx, boxTypeId: string, recipe: Recipe) {
  const entries = Object.entries(recipe).filter(([, q]) => q !== undefined && q > 0) as [MaterialCode, number][];
  const materials = await tx.material.findMany({ where: { code: { in: entries.map(([c]) => c) } } });
  for (const [code, qty] of entries) {
    const m = materials.find((x) => x.code === code);
    if (!m || m.kind !== "HERRAJE") throw new DomainError("NOT_HARDWARE");
    if (!Number.isInteger(qty)) throw new DomainError("INVALID_QUANTITY");
  }
  await tx.recipeItem.deleteMany({ where: { boxTypeId } });
  await tx.recipeItem.createMany({
    data: entries.map(([code, qty]) => ({
      boxTypeId,
      materialId: materials.find((x) => x.code === code)!.id,
      qtyPerBox: qty,
    })),
  });
}

/** Cajas por placa MDF negro: entero positivo, o null si el tipo no usa placa negra. */
function checkYield(v: number | null | undefined) {
  if (v === undefined || v === null) return;
  if (!Number.isInteger(v) || v < 1) throw new DomainError("INVALID_QUANTITY");
}

function checkPrice(unitPrice: number) {
  if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new DomainError("INVALID_INPUT");
}

export async function createBoxType(
  actor: SessionUser,
  input: { name: string; unitPrice: number; recipe: Recipe; boxesPerBlackPlate?: number | null },
): Promise<BoxType> {
  assertCan(actor, "catalog.edit");
  const name = input.name.trim();
  if (!name) throw new DomainError("INVALID_INPUT");
  checkPrice(input.unitPrice);
  checkYield(input.boxesPerBlackPlate);
  const recipe = Object.keys(input.recipe).length ? input.recipe : DEFAULT_RECIPE;
  return prisma.$transaction(async (tx) => {
    const bt = await tx.boxType.create({ data: { name, boxesPerBlackPlate: input.boxesPerBlackPlate ?? null } });
    await writeRecipe(tx, bt.id, recipe);
    await tx.priceEntry.create({
      data: { boxTypeId: bt.id, unitPrice: input.unitPrice, validFrom: INITIAL_PRICE_FROM, createdById: actor.id },
    });
    return bt;
  });
}

export async function updateBoxType(
  actor: SessionUser,
  id: string,
  input: { name?: string; active?: boolean; recipe?: Recipe; boxesPerBlackPlate?: number | null },
): Promise<void> {
  assertCan(actor, "catalog.edit");
  checkYield(input.boxesPerBlackPlate);
  await prisma.$transaction(async (tx) => {
    const data: Prisma.BoxTypeUpdateInput = {};
    if (input.name !== undefined) {
      if (!input.name.trim()) throw new DomainError("INVALID_INPUT");
      data.name = input.name.trim();
    }
    if (input.active !== undefined) data.active = input.active;
    if (input.boxesPerBlackPlate !== undefined) data.boxesPerBlackPlate = input.boxesPerBlackPlate;
    await tx.boxType.update({ where: { id }, data });
    if (input.recipe) await writeRecipe(tx, id, input.recipe);
  });
}

export async function setPrice(
  actor: SessionUser,
  boxTypeId: string,
  unitPrice: number,
  validFrom: Date = new Date(),
): Promise<void> {
  assertCan(actor, "prices.edit");
  checkPrice(unitPrice);
  await prisma.priceEntry.create({ data: { boxTypeId, unitPrice, validFrom, createdById: actor.id } });
}

export async function getPriceAt(boxTypeId: string, at: Date, tx: Tx = prisma): Promise<Prisma.Decimal> {
  const p = await tx.priceEntry.findFirst({
    where: { boxTypeId, validFrom: { lte: at } },
    orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }],
  });
  if (!p) throw new DomainError("NO_PRICE");
  return p.unitPrice;
}

export async function getRecipe(
  boxTypeId: string,
  tx: Tx = prisma,
): Promise<{ materialId: string; qtyPerBox: number }[]> {
  return tx.recipeItem.findMany({ where: { boxTypeId }, select: { materialId: true, qtyPerBox: true } });
}

export async function listBoxTypes({ includeInactive = false }: { includeInactive?: boolean }) {
  const now = new Date();
  const types = await prisma.boxType.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: "asc" },
    include: {
      prices: { where: { validFrom: { lte: now } }, orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }], take: 1 },
    },
  });
  return types.map(({ prices, ...t }) => ({ ...t, currentPrice: prices[0]?.unitPrice ?? null }));
}

export async function getBoxTypeDetail(id: string) {
  return prisma.boxType.findUniqueOrThrow({
    where: { id },
    include: {
      recipe: { include: { material: true } },
      prices: { orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }], include: { createdBy: { select: { name: true } } } },
    },
  });
}

export async function renameMaterial(actor: SessionUser, code: "CIERRE_A" | "CIERRE_B", name: string) {
  assertCan(actor, "catalog.edit");
  if (!name.trim()) throw new DomainError("INVALID_INPUT");
  await prisma.material.update({ where: { code }, data: { name: name.trim() } });
}
