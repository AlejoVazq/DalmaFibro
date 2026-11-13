import type { OrderStatus, Prisma, Priority } from "@prisma/client";
import { assertCan, type SessionUser } from "@/lib/auth/permissions";
import { getStockOverview } from "./commitments";
import { getAccountBalance } from "./invoices";
import { listOrders, OPEN_STATUSES } from "./orders";
import { stockLevel, type StockLevel } from "./stock-levels";
import type { MaterialCode } from "@/lib/materials";

export type StockAlert = { code: MaterialCode; name: string; available: number; level: Exclude<StockLevel, "ok"> };
const SEVERITY: Record<StockLevel, number> = { falta: 0, critico: 1, bajo: 2, ok: 3 };

export type OrderSummary = {
  id: string;
  number: number;
  status: OrderStatus;
  priority: Priority;
  createdAt: Date;
  boxes: number;
  boxNames: string;
};

export type Dashboard = {
  readyForPickup: OrderSummary[];
  openOrders: OrderSummary[];
  /** Herrajes con Libre bajo el umbral o negativo, de más grave a menos grave. */
  stockAlerts: StockAlert[];
  owed?: Prisma.Decimal;
  unpaidCount?: number;
};

export async function getDashboard(actor: SessionUser): Promise<Dashboard> {
  assertCan(actor, "orders.view");
  const [orders, stock, balance] = await Promise.all([
    listOrders(actor, { status: OPEN_STATUSES }),
    getStockOverview(),
    getAccountBalance(actor),
  ]);
  const openOrders: OrderSummary[] = orders.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    priority: o.priority,
    createdAt: o.createdAt,
    boxes: o.lines.reduce((s, l) => s + l.quantity, 0),
    boxNames: [...new Set(o.lines.map((l) => l.boxType.name))].join(", "),
  }));
  return {
    readyForPickup: openOrders.filter((o) => o.status === "LISTO"),
    openOrders,
    stockAlerts: stock.hardware
      .map((h) => ({ code: h.code, name: h.name, available: h.available, level: stockLevel(h.code, h.available) }))
      .filter((a): a is StockAlert => a.level !== "ok")
      .sort((a, b) => SEVERITY[a.level] - SEVERITY[b.level]),
    owed: balance.owed,
    unpaidCount: balance.unpaid.length,
  };
}
