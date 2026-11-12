import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { listOrders, OPEN_STATUSES } from "@/domain/orders";
import { StatusBadge } from "@/components/status-badge";
import { LinkButton } from "@/components/link-button";
import { fmtDate } from "@/lib/format";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/labels";

const FILTERS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "abiertos", label: "Abiertos", statuses: OPEN_STATUSES },
  { key: "LISTO", label: STATUS_LABEL.LISTO, statuses: ["LISTO"] },
  { key: "ENTREGADO", label: "Entregados", statuses: ["ENTREGADO"] },
  { key: "CANCELADO", label: "Cancelados", statuses: ["CANCELADO"] },
  { key: "todos", label: "Todos" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const actor = await requireUser();
  const { f = "abiertos" } = await searchParams;
  const filter = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const orders = await listOrders(actor, { status: filter.statuses });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Pedidos</h1>
        {can(actor, "orders.create") && (
          <LinkButton href="/pedidos/nuevo">Nuevo pedido</LinkButton>
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {FILTERS.map((x) => (
          <Link key={x.key} href={`?f=${x.key}`} className={x.key === filter.key ? "font-semibold underline" : "hover:underline"}>
            {x.label}
          </Link>
        ))}
      </div>
      <ul className="divide-y border rounded-md">
        {orders.map((o) => {
          const boxes = o.lines.reduce((s, l) => s + l.quantity, 0);
          return (
            <li key={o.id}>
              <Link href={`/pedidos/${o.id}`} className="p-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-muted/40">
                <span className="font-medium">#{o.number}</span>
                <span className="text-sm text-muted-foreground">{fmtDate(o.createdAt)}</span>
                <span className="text-sm">Prioridad {PRIORITY_LABEL[o.priority]}</span>
                <span className="text-sm">
                  {boxes} cajas · {o.lines.map((l) => l.boxType.name).join(", ")}
                </span>
                <span className="ml-auto">
                  <StatusBadge status={o.status} />
                </span>
              </Link>
            </li>
          );
        })}
        {orders.length === 0 && <li className="p-3 text-muted-foreground">No hay pedidos.</li>}
      </ul>
    </div>
  );
}
