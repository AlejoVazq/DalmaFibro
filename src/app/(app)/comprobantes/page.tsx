import Link from "next/link";
import { ChevronRight, Download, Receipt, Scale, SlidersHorizontal } from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { listInvoices } from "@/domain/invoices";
import { StatusBadge } from "@/components/status-badge";
import { LinkButton } from "@/components/link-button";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dayEnd, dayStart, fmtDate, fmtMoney } from "@/lib/format";
import { INVOICE_STATUS_LABEL } from "@/lib/labels";

type SP = { status?: string; from?: string; to?: string };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireUser();
  const sp = await searchParams;
  const status = sp.status && sp.status in INVOICE_STATUS_LABEL ? (sp.status as InvoiceStatus) : undefined;
  const invoices = await listInvoices(actor, { status, from: dayStart(sp.from), to: dayEnd(sp.to) });
  const filtered = Boolean(sp.status || sp.from || sp.to);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Comprobantes"
        description="Lo que el taller le cobra a Dalmata por cada entrega."
        actions={
          <LinkButton href="/comprobantes/saldo" variant="outline">
            <Scale aria-hidden /> Ver saldo
          </LinkButton>
        }
      />

      <details className="group rounded-xl border bg-card" open={filtered}>
        <summary className="flex h-12 cursor-pointer list-none items-center gap-2 px-4 font-medium [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtrar{can(actor, "export.excel") && " y exportar"}
          {filtered && <span className="rounded-full bg-accent px-2 text-xs text-accent-foreground">activo</span>}
          <ChevronRight className="ml-auto size-4 transition-transform group-open:rotate-90" aria-hidden />
        </summary>
        <div className="space-y-4 border-t p-4">
          <form id="invoice-filter" className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <NativeSelect id="status" name="status" defaultValue={sp.status ?? ""}>
                <option value="">Todos</option>
                {Object.entries(INVOICE_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from">Desde</Label>
              <Input id="from" name="from" type="date" defaultValue={sp.from} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">Hasta</Label>
              <Input id="to" name="to" type="date" defaultValue={sp.to} />
            </div>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
          </form>
          {filtered && (
            <Link href="/comprobantes" className="text-sm text-primary underline-offset-4 hover:underline">
              Quitar filtros
            </Link>
          )}
          {can(actor, "export.excel") && (
            <div className="space-y-1 border-t pt-4">
              {/* Envía el mismo formulario a /api/export: usa las fechas que están cargadas, aunque no se haya tocado Filtrar. */}
              <button type="submit" form="invoice-filter" formAction="/api/export" className={buttonVariants({ variant: "outline" })}>
                <Download aria-hidden /> Exportar a Excel
              </button>
              <p className="text-sm text-muted-foreground">Usa las fechas Desde/Hasta. Sin fechas, exporta el mes actual.</p>
            </div>
          )}
        </div>
      </details>

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No hay comprobantes"
          hint={filtered ? "Probá cambiando los filtros." : "Se crean desde una entrega, con el botón «Hacer comprobante»."}
        />
      ) : (
        <ul className="space-y-2">
          {invoices.map((i) => (
            <li key={i.id}>
              <Link
                href={`/comprobantes/${i.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">Comprobante #{i.number}</span>
                    <StatusBadge status={i.status} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {fmtDate(i.issuedAt)} · Pedido #{i.delivery.order.number}
                  </div>
                </div>
                <span className="text-lg font-semibold whitespace-nowrap">{fmtMoney(i.total)}</span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
