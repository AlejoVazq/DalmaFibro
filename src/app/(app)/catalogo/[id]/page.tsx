import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth/current";
import { assertCan } from "@/lib/auth/permissions";
import { getBoxTypeDetail, type Recipe } from "@/domain/catalog";
import { prisma } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
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
    <div className="max-w-xl space-y-6">
      <PageHeader title={bt.name} back={{ href: "/catalogo", label: "Catálogo" }} />

      <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="text-lg font-semibold">Datos y herrajes</h2>
      <ActionForm action={updateBoxTypeAction} className="space-y-4" resetOnSuccess={false}>
        <input type="hidden" name="id" value={bt.id} />
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" defaultValue={bt.name} required />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 has-checked:border-primary has-checked:bg-accent">
          <input type="checkbox" name="active" defaultChecked={bt.active} className="size-5 accent-[var(--primary)]" />
          <span className="font-medium">Se puede pedir</span>
        </label>
        <RecipeFields closures={closures} values={recipe} blackPlate={bt.boxesPerBlackPlate} />
        <SubmitButton className="w-full sm:w-auto">Guardar cambios</SubmitButton>
      </ActionForm>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div>
          <h2 className="text-lg font-semibold">Precio</h2>
          <p className="text-sm text-muted-foreground">Los comprobantes usan el precio vigente el día de la entrega.</p>
        </div>
        <ActionForm action={setPriceAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="id" value={bt.id} />
          <div className="space-y-1.5">
            <Label htmlFor="unitPrice">Nuevo precio por caja</Label>
            <Input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" inputMode="decimal" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="validFrom">Desde el día</Label>
            <Input id="validFrom" name="validFrom" type="date" defaultValue={isoDay(new Date())} />
          </div>
          <SubmitButton>Guardar precio</SubmitButton>
        </ActionForm>
        <h3 className="text-sm font-semibold text-muted-foreground">Historial</h3>
        <ul className="divide-y rounded-lg border text-sm">
          {bt.prices.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 p-3">
              <span>{p.validFrom.getFullYear() <= 2000 ? "Precio inicial" : `Desde el ${fmtDate(p.validFrom)}`}</span>
              <span className="font-semibold">{fmtMoney(p.unitPrice)}</span>
              <span className="w-full text-muted-foreground sm:w-auto">cargó {p.createdBy.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
