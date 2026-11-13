import Link from "next/link";
import { BookOpen, ChevronRight, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/current";
import { assertCan } from "@/lib/auth/permissions";
import { listBoxTypes } from "@/domain/catalog";
import { prisma } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SubmitButton } from "@/components/submit-button";
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
      <PageHeader title="Catálogo" description="Tipos de caja, precios y herrajes que lleva cada una." />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tipos de caja</h2>
        {types.length === 0 ? (
          <EmptyState icon={BookOpen} title="Todavía no hay tipos de caja" hint="Creá el primero acá abajo." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {types.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/catalogo/${t.id}`}
                  className={`flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 ${t.active ? "" : "opacity-70"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-semibold">
                      {t.name}
                      {!t.active && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">No se puede pedir</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">Precio por caja</div>
                  </div>
                  <span className="text-lg font-semibold">{fmtMoney(t.currentPrice)}</span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="group max-w-xl rounded-xl border bg-card" open={types.length === 0}>
        <summary className="flex h-12 cursor-pointer list-none items-center gap-2 px-4 font-semibold [&::-webkit-details-marker]:hidden">
          <Plus className="size-5 text-primary" aria-hidden /> Nuevo tipo de caja
          <ChevronRight className="ml-auto size-4 transition-transform group-open:rotate-90" aria-hidden />
        </summary>
        <ActionForm action={createBoxTypeAction} className="space-y-4 border-t p-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" placeholder="Premium, Clásica, Vino, 2 Gin…" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unitPrice">Precio por caja (mano de obra)</Label>
            <Input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" inputMode="decimal" required />
          </div>
          <RecipeFields closures={closures} />
          <SubmitButton className="w-full sm:w-auto">Crear tipo de caja</SubmitButton>
        </ActionForm>
      </details>

      <section className="max-w-xl space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Nombres de los cierres</h2>
          <p className="text-sm text-muted-foreground">Cómo se llaman los dos tipos de cierre en toda la app.</p>
        </div>
        {closures.map((c, i) => (
          <ActionForm key={c.code} action={renameMaterialAction} className="flex flex-wrap items-end gap-2" resetOnSuccess={false}>
            <input type="hidden" name="code" value={c.code} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor={`closure_${c.code}`}>Cierre {i + 1}</Label>
              <Input id={`closure_${c.code}`} name="name" defaultValue={c.name} required />
            </div>
            <SubmitButton variant="outline">Guardar</SubmitButton>
          </ActionForm>
        ))}
      </section>
    </div>
  );
}
