import { MOVEMENT_LABEL } from "@/lib/labels";
import Link from "next/link";
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

  return (
    <div className="space-y-4">
      <Link href="/stock" className="text-sm hover:underline">
        ← Stock
      </Link>
      <h1 className="text-xl font-semibold">Movimientos de stock</h1>
      <form className="flex flex-wrap gap-2 items-end">
        <Input type="date" name="from" defaultValue={sp.from} className="w-40" />
        <Input type="date" name="to" defaultValue={sp.to} className="w-40" />
        <NativeSelect name="material" defaultValue={sp.material ?? ""} className="w-56">
          <option value="">Todos los materiales</option>
          {MATERIALS.map((m) => (
            <option key={m.code} value={m.code}>
              {m.name}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded-md">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Fecha</th>
              <th className="p-2">Material</th>
              <th className="p-2">Ubicación</th>
              <th className="p-2">Tipo</th>
              <th className="p-2 text-right">Cantidad</th>
              <th className="p-2">Pedido</th>
              <th className="p-2">Usuario</th>
              <th className="p-2">Nota</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{fmtDateTime(m.createdAt)}</td>
                <td className="p-2">{m.material.name}</td>
                <td className="p-2">{m.location === "TALLER" ? "Taller" : "Dalmata"}</td>
                <td className="p-2">{MOVEMENT_LABEL[m.type]}</td>
                <td className={`p-2 text-right ${m.quantity < 0 ? "text-red-600" : "text-green-700"}`}>
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </td>
                <td className="p-2">{m.order ? `#${m.order.number}` : ""}</td>
                <td className="p-2">{m.createdBy.name}</td>
                <td className="p-2">{m.note}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="p-3 text-muted-foreground">
                  No hay movimientos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 text-sm">
        {page > 1 && <Link href={`?${qs(page - 1)}`}>← Anteriores</Link>}
        {page * PAGE < total && <Link href={`?${qs(page + 1)}`}>Siguientes →</Link>}
        <span className="text-muted-foreground">{total} movimientos</span>
      </div>
    </div>
  );
}
