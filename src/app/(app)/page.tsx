import Link from "next/link";
import { ArrowRight, ClipboardList, PackageCheck, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { getDashboard, type OrderSummary } from "@/domain/dashboard";
import { LinkButton } from "@/components/link-button";
import { OrderCard } from "@/components/order-card";
import { EmptyState } from "@/components/empty-state";
import { Notice } from "@/components/notice";
import { StockLevelChip } from "@/components/stock-level-chip";
import { fmtMoney } from "@/lib/format";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Orders({ orders, highlight, empty }: { orders: OrderSummary[]; highlight?: boolean; empty: React.ReactNode }) {
  if (orders.length === 0) return <>{empty}</>;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} highlight={highlight} />
      ))}
    </div>
  );
}

export default async function HomePage() {
  const user = await requireUser();
  const d = await getDashboard(user);
  const isDalmata = user.role === "DALMATA";
  const canCreate = can(user, "orders.create");

  const newOrder = canCreate && (
    <LinkButton href="/pedidos/nuevo" size="lg" className="w-full sm:w-auto">
      <Plus aria-hidden /> Nuevo pedido
    </LinkButton>
  );

  const ready = (
    <Section
      title="Listos para retirar"
      hint={isDalmata ? "Estas cajas ya están terminadas en el taller." : "Dalmata ya los ve en su inicio."}
    >
      <Orders
        orders={d.readyForPickup}
        highlight
        empty={<EmptyState icon={PackageCheck} title="Nada listo para retirar por ahora" />}
      />
    </Section>
  );

  const urgent = d.stockAlerts.some((a) => a.level !== "bajo");
  const stockAlert = d.stockAlerts.length > 0 && (
    <Notice
      tone={urgent ? "error" : "warning"}
      className={isDalmata ? "border-2 p-4 text-base" : undefined}
      title={isDalmata ? "Hay que comprar herrajes" : "Herrajes por acabarse"}
    >
      <p className="text-muted-foreground">
        {isDalmata
          ? "Lo que queda libre en el taller, ya descontando los pedidos abiertos."
          : "Dalmata también ve este aviso. Libre = lo que queda después de los pedidos abiertos."}
      </p>
      <ul className="my-2 space-y-1.5">
        {d.stockAlerts.map((a) => (
          <li key={a.code} className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{a.name}:</span>
            <span>{a.available < 0 ? "no alcanza para los pedidos" : <>quedan <strong>{a.available}</strong> libres</>}</span>
            <StockLevelChip level={a.level} available={a.available} />
          </li>
        ))}
      </ul>
      <Link href="/stock" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
        Ver stock <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Notice>
  );

  const open = (
    <Section
      title={isDalmata ? "Pedidos en curso" : "Pedidos abiertos"}
      hint={isDalmata ? undefined : "Ordenados por prioridad: arriba lo más urgente."}
    >
      <Orders
        orders={d.openOrders.filter((o) => o.status !== "LISTO")}
        empty={
          <EmptyState
            icon={ClipboardList}
            title="No hay pedidos abiertos"
            hint={canCreate ? "Cuando cargues un pedido nuevo, aparece acá." : undefined}
          />
        }
      />
    </Section>
  );

  const owed = Number(d.owed ?? 0);
  const balance = (
    <Link
      href="/comprobantes/saldo"
      className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex-1">
        <div className="text-sm text-muted-foreground">Saldo adeudado</div>
        <div className={`text-2xl font-semibold ${owed > 0 ? "text-warning" : "text-success"}`}>{fmtMoney(d.owed ?? 0)}</div>
        <div className="text-sm">
          {d.unpaidCount === 0 ? "No hay comprobantes pendientes de pago." : `${d.unpaidCount} comprobante(s) sin pagar.`}
        </div>
      </div>
      <span className="flex items-center gap-1 text-sm font-medium text-primary">
        Ver saldo <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hola, {user.name}</h1>
          <p className="text-muted-foreground">
            {isDalmata ? "Acá ves cómo van tus pedidos." : "Esto es lo que hay que hacer hoy."}
          </p>
        </div>
        {newOrder}
      </div>

      {isDalmata ? (
        <>
          {stockAlert}
          {ready}
          {open}
          {balance}
        </>
      ) : (
        <>
          {stockAlert}
          {open}
          {ready}
          {balance}
        </>
      )}
    </div>
  );
}
