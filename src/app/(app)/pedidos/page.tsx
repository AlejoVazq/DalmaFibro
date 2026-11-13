import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { listOrders, OPEN_STATUSES } from "@/domain/orders";
import { LinkButton } from "@/components/link-button";
import { OrderCard } from "@/components/order-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

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
  const canCreate = can(actor, "orders.create");
  const newOrder = (
    <LinkButton href="/pedidos/nuevo">
      <Plus aria-hidden /> Nuevo pedido
    </LinkButton>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Pedidos" description="Tocá un pedido para ver el detalle." actions={canCreate && newOrder} />

      <nav aria-label="Filtrar pedidos" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-xl bg-muted p-1">
          {FILTERS.map((x) => {
            const active = x.key === filter.key;
            return (
              <li key={x.key}>
                <Link
                  href={`?f=${x.key}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center rounded-lg px-4 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground",
                    active && "bg-card text-foreground shadow-sm",
                  )}
                >
                  {x.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay pedidos acá"
          hint={filter.key === "abiertos" ? "Todos los pedidos están entregados o cancelados." : "Probá con otro filtro."}
          action={canCreate && newOrder}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              highlight={o.status === "LISTO"}
              order={{
                id: o.id,
                number: o.number,
                status: o.status,
                priority: o.priority,
                createdAt: o.createdAt,
                boxes: o.lines.reduce((s, l) => s + l.quantity, 0),
                boxNames: [...new Set(o.lines.map((l) => l.boxType.name))].join(", "),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
