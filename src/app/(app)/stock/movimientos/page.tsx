import { MOVEMENT_LABEL } from "@/lib/labels";
import { History } from "lucide-react";
import { LinkButton } from "@/components/link-button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/current";
import { listMovements } from "@/domain/stock";
import { MATERIALS, type MaterialCode } from "@/lib/materials";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDateTime } from "@/lib/format";

const PAGE = 50;

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; material?: string; page?: string }>;
}) {
  const actor = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total } = await listMovements(actor, {
    from: sp.from ? new Date(`${sp.from}T00:00:00-03:00`) : undefined,
    to: sp.to ? new Date(`${sp.to}T23:59:59.999-03:00`) : undefined,
    materialCode: (sp.material || undefined) as MaterialCode | undefined,
    take: PAGE,
    skip: (page - 1) * PAGE,
  });
  const qs = (p: number) => new URLSearchParams({ ...sp, page: String(p) } as Record<string, string>).toString();

  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

  return (
    <div className="space-y-5">
      <PageHeader title="Movimientos de stock" back={{ href: "/stock", label: "Stock" }} description="Todo lo que entró y salió, del más nuevo al más viejo." />
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_1.5fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="from">Desde</Label>
          <Input id="from" type="date" name="from" defaultValue={sp.from} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">Hasta</Label>
          <Input id="to" type="date" name="to" defaultValue={sp.to} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="material">Material</Label>
          <NativeSelect id="material" name="material" defaultValue={sp.material ?? ""}>
            <option value="">Todos los materiales</option>
            {MATERIALS.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon={History} title="No hay movimientos" hint="Probá con otras fechas o material." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {items.map((m) => (
              <li key={m.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{m.material.name}</div>
                  <div className="text-sm">{MOVEMENT_LABEL[m.type]}{m.order ? ` · Pedido #${m.order.number}` : ""}</div>
                  <div className="text-sm text-muted-foreground">
                    {fmtDateTime(m.createdAt)} · {m.location === "TALLER" ? "Taller" : "Dalmata"} · {m.createdBy.name}
                  </div>
                  {m.note && <div className="text-sm text-muted-foreground italic">{m.note}</div>}
                </div>
                <span className={`text-xl font-semibold ${m.quantity < 0 ? "text-destructive" : "text-success"}`}>{sign(m.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Material</th>
                  <th className="p-3">Dónde</th>
                  <th className="p-3">Qué pasó</th>
                  <th className="p-3 text-right">Cantidad</th>
                  <th className="p-3">Pedido</th>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Nota</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">{fmtDateTime(m.createdAt)}</td>
                    <td className="p-3">{m.material.name}</td>
                    <td className="p-3">{m.location === "TALLER" ? "Taller" : "Dalmata"}</td>
                    <td className="p-3">{MOVEMENT_LABEL[m.type]}</td>
                    <td className={`p-3 text-right font-semibold ${m.quantity < 0 ? "text-destructive" : "text-success"}`}>{sign(m.quantity)}</td>
                    <td className="p-3">{m.order ? `#${m.order.number}` : ""}</td>
                    <td className="p-3">{m.createdBy.name}</td>
                    <td className="p-3">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {page > 1 && (
          <LinkButton href={`?${qs(page - 1)}`} variant="outline">
            ← Más nuevos
          </LinkButton>
        )}
        {page * PAGE < total && (
          <LinkButton href={`?${qs(page + 1)}`} variant="outline">
            Más viejos →
          </LinkButton>
        )}
        <span className="text-sm text-muted-foreground">{total} movimientos en total</span>
      </div>
    </div>
  );
}
