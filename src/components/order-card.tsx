import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { OrderSummary } from "@/domain/dashboard";
import { StatusBadge } from "@/components/status-badge";
import { fmtDate } from "@/lib/format";
import { PRIORITY_COLOR, PRIORITY_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function PriorityChip({ priority }: { priority: OrderSummary["priority"] }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide", PRIORITY_COLOR[priority])}>
      Prioridad {PRIORITY_LABEL[priority]}
    </span>
  );
}

/** Tarjeta tocable de un pedido. */
export function OrderCard({ order, highlight }: { order: OrderSummary; highlight?: boolean }) {
  return (
    <Link
      href={`/pedidos/${order.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40",
        highlight && "border-success/50 bg-success/5",
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold">Pedido #{order.number}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <PriorityChip priority={order.priority} />
          <span className="font-medium">{order.boxes} cajas</span>
          <span className="text-muted-foreground">{fmtDate(order.createdAt)}</span>
        </div>
        <p className="line-clamp-2 text-sm break-words text-muted-foreground">{order.boxNames}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
    </Link>
  );
}
