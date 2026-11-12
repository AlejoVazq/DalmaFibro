import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { assertCan } from "@/lib/auth/permissions";
import { getBoxTypeDetail, type Recipe } from "@/domain/catalog";
import { prisma } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate, fmtMoney, isoDay } from "@/lib/format";
import { setPriceAction, updateBoxTypeAction } from "../actions";
import { RecipeFields } from "../recipe-fields";

export default async function BoxTypePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  assertCan(actor, "catalog.edit");
  const { id } = await params;
  const [bt, closures] = await Promise.all([
    getBoxTypeDetail(id),
    prisma.material.findMany({ where: { code: { in: ["CIERRE_A", "CIERRE_B"] } }, orderBy: { code: "asc" } }),
  ]);
  const recipe: Recipe = Object.fromEntries(bt.recipe.map((r) => [r.material.code, r.qtyPerBox]));
  return (
    <div className="space-y-8 max-w-xl">
      <Link href="/catalogo" className="text-sm hover:underline">
        ← Catálogo
      </Link>
      <h1 className="text-xl font-semibold">{bt.name}</h1>

      <ActionForm action={updateBoxTypeAction} className="space-y-3" resetOnSuccess={false}>
        <input type="hidden" name="id" value={bt.id} />
        <div className="space-y-1">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" defaultValue={bt.name} required />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={bt.active} /> Activo (se puede pedir)
        </label>
        <RecipeFields closures={closures} values={recipe} />
        <Button type="submit">Guardar</Button>
      </ActionForm>

      <section className="space-y-3">
        <h2 className="font-semibold">Precio</h2>
        <ActionForm action={setPriceAction} className="flex flex-wrap gap-2 items-end">
          <input type="hidden" name="id" value={bt.id} />
          <div className="space-y-1">
            <Label htmlFor="unitPrice">Nuevo precio</Label>
            <Input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" required className="w-36" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="validFrom">Vigente desde</Label>
            <Input id="validFrom" name="validFrom" type="date" defaultValue={isoDay(new Date())} className="w-44" />
          </div>
          <Button type="submit">Guardar precio</Button>
        </ActionForm>
        <ul className="divide-y border rounded-md text-sm">
          {bt.prices.map((p) => (
            <li key={p.id} className="p-2 flex justify-between">
              <span>{p.validFrom.getFullYear() <= 2000 ? "precio inicial" : `desde ${fmtDate(p.validFrom)}`}</span>
              <span>{fmtMoney(p.unitPrice)}</span>
              <span className="text-muted-foreground">{p.createdBy.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
