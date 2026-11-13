import { prisma, type Tx } from "@/lib/db";
import { assertCan, type SessionUser } from "@/lib/auth/permissions";
import { DomainError } from "@/lib/errors";
import type { MaterialCode } from "@/lib/materials";
import { getCommitments } from "./commitments";
import { getBalances } from "./stock";

export type Shortage = { code: MaterialCode; name: string; missing: number };

/** Se tiró al crear/editar un pedido que deja herrajes en negativo sin marcar que ya se encargaron. */
export class MaterialsShortError extends DomainError {
  constructor(public shortage: Shortage[]) {
    super("MATERIALS_SHORT");
  }
}

/**
 * Herrajes que no alcanzarían si se suman estas líneas a lo ya reservado por los pedidos abiertos.
 * Solo cuenta los herrajes que estas líneas usan. `excludeOrderId`: el pedido que se está editando.
 */
export async function shortageFor(
  tx: Tx,
  lines: { boxTypeId: string; quantity: number }[],
  excludeOrderId?: string,
): Promise<Shortage[]> {
  const recipe = await tx.recipeItem.findMany({ where: { boxTypeId: { in: lines.map((l) => l.boxTypeId) } } });
  const need = new Map<string, number>();
  for (const l of lines) {
    for (const r of recipe.filter((r) => r.boxTypeId === l.boxTypeId)) {
      need.set(r.materialId, (need.get(r.materialId) ?? 0) + l.quantity * r.qtyPerBox);
    }
  }
  const [balances, committed] = await Promise.all([getBalances(tx), getCommitments(tx, excludeOrderId)]);
  return balances
    .filter((b) => b.kind === "HERRAJE" && need.has(b.materialId))
    .map((b) => ({ code: b.code, name: b.name, free: b.taller - (committed.get(b.materialId) ?? 0) - need.get(b.materialId)! }))
    .filter((b) => b.free < 0)
    .map(({ code, name, free }) => ({ code, name, missing: -free }));
}

/** Para el formulario: lo que faltaría con estas líneas, antes de guardar. Ignora cantidades vacías o inválidas. */
export async function previewShortage(
  actor: SessionUser,
  lines: { boxTypeId: string; quantity: number }[],
  orderId?: string,
): Promise<Shortage[]> {
  assertCan(actor, orderId ? "orders.edit" : "orders.create");
  const valid = lines.filter((l) => l.boxTypeId && Number.isInteger(l.quantity) && l.quantity > 0);
  if (valid.length === 0) return [];
  return shortageFor(prisma, valid, orderId);
}
