import Link from "next/link";
import type { InvoiceStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { listInvoices } from "@/domain/invoices";
import { StatusBadge } from "@/components/status-badge";
import { LinkButton } from "@/components/link-button";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
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
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Comprobantes</h1>
        <div className="flex gap-2">
          <LinkButton href="/comprobantes/saldo" variant="outline">
            Saldo
          </LinkButton>
          {can(actor, "export.excel") && (
            <a href={`/api/export?${qs}`} className="inline-flex">
              <Button variant="outline" type="button">
                Exportar a Excel
              </Button>
            </a>
          )}
        </div>
      </div>
      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="status">Estado</Label>
          <NativeSelect id="status" name="status" defaultValue={sp.status ?? ""} className="w-44">
            <option value="">Todos</option>
            {Object.entries(INVOICE_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="from">Desde</Label>
          <Input id="from" name="from" type="date" defaultValue={sp.from} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">Hasta</Label>
          <Input id="to" name="to" type="date" defaultValue={sp.to} />
        </div>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>
      <ul className="divide-y border rounded-md">
        {invoices.map((i) => (
          <li key={i.id}>
            <Link href={`/comprobantes/${i.id}`} className="p-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-muted/40">
              <span className="font-medium">#{i.number}</span>
              <span className="text-sm text-muted-foreground">{fmtDate(i.issuedAt)}</span>
              <span className="text-sm">Pedido #{i.delivery.order.number}</span>
              <span className="text-sm font-medium">{fmtMoney(i.total)}</span>
              <span className="ml-auto">
                <StatusBadge status={i.status} />
              </span>
            </Link>
          </li>
        ))}
        {invoices.length === 0 && <li className="p-3 text-muted-foreground">No hay comprobantes.</li>}
      </ul>
    </div>
  );
}
