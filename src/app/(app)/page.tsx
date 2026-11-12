import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { getDashboard, type OrderSummary } from "@/domain/dashboard";
import { LinkButton } from "@/components/link-button";
import { StatusBadge } from "@/components/status-badge";
import { fmtDate, fmtMoney } from "@/lib/format";
import { PRIORITY_LABEL } from "@/lib/labels";

function OrderList({ orders, empty }: { orders: OrderSummary[]; empty: string }) {
  return (
    <ul className="divide-y border rounded-md">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/pedidos/${o.id}`} className="p-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-muted/40">
            <span className="font-medium">#{o.number}</span>
            <span className="text-sm text-muted-foreground">{fmtDate(o.createdAt)}</span>
            <span className="text-sm">Prioridad {PRIORITY_LABEL[o.priority]}</span>
            <span className="text-sm">
              {o.boxes} cajas · {o.boxNames}
            </span>
            <span className="ml-auto">
              <StatusBadge status={o.status} />
            </span>
          </Link>
        </li>
      ))}
      {orders.length === 0 && <li className="p-3 text-muted-foreground">{empty}</li>}
    </ul>
  );
}

export default async function HomePage() {
  const user = await requireUser();
  const d = await getDashboard(user);
  const isDalmata = user.role === "DALMATA";

  const ready = (
    <section className="space-y-2">
      <h2 className="font-semibold">Listos para retirar</h2>
      <OrderList orders={d.readyForPickup} empty="No hay pedidos listos para retirar." />
    </section>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Hola, {user.name}</h1>
        {can(user, "orders.create") && <LinkButton href="/pedidos/nuevo">Nuevo pedido</LinkButton>}
      </div>

      {isDalmata && ready}

      {d.stockAlerts.length > 0 && (
        <section className="border border-amber-300 bg-amber-50 text-amber-900 rounded-md p-3 text-sm space-y-1">
          <div className="font-semibold">Falta stock de herrajes para los pedidos abiertos</div>
          <ul>
            {d.stockAlerts.map((a) => (
              <li key={a.name}>
                {a.name}: faltan {-a.available}
              </li>
            ))}
          </ul>
          <Link href="/stock" className="underline">
            Ver stock
          </Link>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">{isDalmata ? "Pedidos en curso" : "Pedidos abiertos (por prioridad)"}</h2>
        <OrderList orders={d.openOrders} empty="No hay pedidos abiertos." />
      </section>

      {!isDalmata && ready}

      <section className="border rounded-md p-3 flex flex-wrap items-center gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Saldo adeudado</div>
          <div className="text-lg font-semibold">{fmtMoney(d.owed)}</div>
        </div>
        <div className="text-sm">
          {d.unpaidCount === 0 ? "Sin comprobantes pendientes de pago." : `${d.unpaidCount} comprobante(s) sin pagar.`}
        </div>
        <Link href="/comprobantes/saldo" className="ml-auto text-sm underline">
          Ver saldo
        </Link>
      </section>
    </div>
  );
}
