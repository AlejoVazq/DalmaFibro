import { prisma, type Tx } from "@/lib/db";
import { getBalances } from "./stock";
import { OPEN_STATUSES } from "./orders";

/** Herrajes comprometidos por pedidos abiertos: Σ cajas pendientes × receta. */
export async function getCommitments(tx: Tx = prisma, excludeOrderId?: string): Promise<Map<string, number>> {
  const lines = await tx.orderLine.findMany({
    where: { order: { status: { in: OPEN_STATUSES }, id: excludeOrderId ? { not: excludeOrderId } : undefined } },
    include: {
      boxType: { include: { recipe: true } },
      deliveryLines: { where: { delivery: { annulledAt: null } } },
    },
  });
  const result = new Map<string, number>();
  for (const l of lines) {
    const pending = l.quantity - l.deliveryLines.reduce((s, d) => s + d.quantity, 0);
    if (pending <= 0) continue;
    for (const r of l.boxType.recipe) {
      result.set(r.materialId, (result.get(r.materialId) ?? 0) + pending * r.qtyPerBox);
    }
  }
  return result;
}

export async function getStockOverview() {
  const [balances, committed] = await Promise.all([getBalances(), getCommitments()]);
  const hardware = balances
    .filter((b) => b.kind === "HERRAJE")
    .map((b) => {
      const c = committed.get(b.materialId) ?? 0;
      return { ...b, committed: c, available: b.taller - c };
    });
  const plates = balances.filter((b) => b.kind === "PLACA");
  return { hardware, plates, all: balances };
}
