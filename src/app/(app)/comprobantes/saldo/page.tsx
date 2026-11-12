import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { getAccountBalance } from "@/domain/invoices";
import { StatusBadge } from "@/components/status-badge";
import { fmtDate, fmtMoney } from "@/lib/format";

export default async function BalancePage() {
  const actor = await requireUser();
  const bal = await getAccountBalance(actor);

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/comprobantes" className="text-sm hover:underline">
        ← Comprobantes
      </Link>
      <h1 className="text-xl font-semibold">Saldo de cuenta</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border rounded-md p-3">
          <div className="text-sm text-muted-foreground">Total emitido</div>
          <div className="text-lg font-semibold">{fmtMoney(bal.issued)}</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-sm text-muted-foreground">Cobrado</div>
          <div className="text-lg font-semibold">{fmtMoney(bal.paid)}</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-sm text-muted-foreground">Adeudado</div>
          <div className="text-lg font-semibold">{fmtMoney(bal.owed)}</div>
        </div>
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">Comprobantes sin pagar</h2>
        <ul className="divide-y border rounded-md">
          {bal.unpaid.map((u) => (
            <li key={u.id}>
              <Link href={`/comprobantes/${u.id}`} className="p-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-muted/40">
                <span className="font-medium">#{u.number}</span>
                <span className="text-sm text-muted-foreground">{fmtDate(u.issuedAt)}</span>
                <span className="text-sm">
                  {u.daysOld === 0 ? "hoy" : `hace ${u.daysOld} ${u.daysOld === 1 ? "día" : "días"}`}
                </span>
                <span className="text-sm font-medium">{fmtMoney(u.total)}</span>
                <span className="ml-auto">
                  <StatusBadge status={u.status} />
                </span>
              </Link>
            </li>
          ))}
          {bal.unpaid.length === 0 && <li className="p-3 text-muted-foreground">No hay deuda pendiente.</li>}
        </ul>
      </section>
    </div>
  );
}
