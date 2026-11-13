import Link from "next/link";
import { ChevronRight, PartyPopper } from "lucide-react";
import { requireUser } from "@/lib/auth/current";
import { getAccountBalance } from "@/domain/invoices";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { fmtDate, fmtMoney } from "@/lib/format";

export default async function BalancePage() {
  const actor = await requireUser();
  const bal = await getAccountBalance(actor);
  const owes = Number(bal.owed) > 0;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Saldo de cuenta"
        back={{ href: "/comprobantes", label: "Comprobantes" }}
        description="Cuánto se facturó, cuánto se cobró y cuánto falta cobrar."
      />

      <div className={`rounded-xl border-2 p-5 ${owes ? "border-warning/50 bg-warning/8" : "border-success/40 bg-success/8"}`}>
        <div className="text-sm font-medium text-muted-foreground">Dalmata debe</div>
        <div className={`text-4xl font-bold tracking-tight ${owes ? "text-warning" : "text-success"}`}>{fmtMoney(bal.owed)}</div>
        <div className="mt-1 text-sm">{owes ? `${bal.unpaid.length} comprobante(s) sin pagar` : "Está todo al día."}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total facturado</div>
          <div className="text-xl font-semibold">{fmtMoney(bal.issued)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">Cobrado</div>
          <div className="text-xl font-semibold">{fmtMoney(bal.paid)}</div>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Comprobantes sin pagar</h2>
          <p className="text-sm text-muted-foreground">Del más viejo al más nuevo.</p>
        </div>
        {bal.unpaid.length === 0 ? (
          <EmptyState icon={PartyPopper} title="No hay deuda pendiente" />
        ) : (
          <ul className="space-y-2">
            {bal.unpaid.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/comprobantes/${u.id}`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Comprobante #{u.number}</span>
                      <StatusBadge status={u.status} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {fmtDate(u.issuedAt)} ·{" "}
                      <span className={u.daysOld > 30 ? "font-semibold text-destructive" : undefined}>
                        {u.daysOld === 0 ? "hoy" : `hace ${u.daysOld} ${u.daysOld === 1 ? "día" : "días"}`}
                      </span>
                    </div>
                  </div>
                  <span className="text-lg font-semibold whitespace-nowrap">{fmtMoney(u.total)}</span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
