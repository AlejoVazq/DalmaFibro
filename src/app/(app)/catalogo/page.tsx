import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { assertCan } from "@/lib/auth/permissions";
import { listBoxTypes } from "@/domain/catalog";
import { prisma } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtMoney } from "@/lib/format";
import { createBoxTypeAction, renameMaterialAction } from "./actions";
import { RecipeFields } from "./recipe-fields";

export default async function CatalogPage() {
  const actor = await requireUser();
  assertCan(actor, "catalog.edit");
  const [types, closures] = await Promise.all([
    listBoxTypes({ includeInactive: true }),
    prisma.material.findMany({ where: { code: { in: ["CIERRE_A", "CIERRE_B"] } }, orderBy: { code: "asc" } }),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Catálogo</h1>

      <section className="space-y-2">
        <h2 className="font-semibold">Tipos de caja</h2>
        <ul className="divide-y border rounded-md">
          {types.map((t) => (
            <li key={t.id} className="p-3 flex justify-between gap-2">
              <Link href={`/catalogo/${t.id}`} className="hover:underline font-medium">
                {t.name} {!t.active && <span className="text-muted-foreground">(inactivo)</span>}
              </Link>
              <span>{fmtMoney(t.currentPrice)}</span>
            </li>
          ))}
          {types.length === 0 && <li className="p-3 text-muted-foreground">Todavía no hay tipos de caja.</li>}
        </ul>
      </section>

      <section className="max-w-md space-y-3">
        <h2 className="font-semibold">Nuevo tipo de caja</h2>
        <ActionForm action={createBoxTypeAction} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" placeholder="Premium, Clásica, Vino, 2 Gin…" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="unitPrice">Precio por unidad (mano de obra)</Label>
            <Input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" required />
          </div>
          <RecipeFields closures={closures} />
          <Button type="submit">Crear</Button>
        </ActionForm>
      </section>

      <section className="max-w-md space-y-3">
        <h2 className="font-semibold">Nombres de los cierres</h2>
        {closures.map((c) => (
          <ActionForm key={c.code} action={renameMaterialAction} className="flex gap-2" resetOnSuccess={false}>
            <input type="hidden" name="code" value={c.code} />
            <Input name="name" defaultValue={c.name} required />
            <Button variant="outline" type="submit">
              Guardar
            </Button>
          </ActionForm>
        ))}
      </section>
    </div>
  );
}
