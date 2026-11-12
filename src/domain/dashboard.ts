import type { OrderStatus, Prisma, Priority } from "@prisma/client";
import { assertCan, type SessionUser } from "@/lib/auth/permissions";
import { getStockOverview } from "./commitments";
import { getAccountBalance } from "./invoices";
import { listOrders, OPEN_STATUSES } from "./orders";

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
  stockAlerts: { name: string; available: number }[];
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
    stockAlerts: stock.hardware.filter((h) => h.available < 0).map((h) => ({ name: h.name, available: h.available })),
    owed: balance.owed,
    unpaidCount: balance.unpaid.length,
  };
}
