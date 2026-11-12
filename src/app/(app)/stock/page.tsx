import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { assertCan, can } from "@/lib/auth/permissions";
import { getBalances } from "@/domain/stock";
import {
  adjustmentAction,
  discardAction,
  ingresoAction,
  plateArrivalAction,
  platePickupAction,
  plateUseAction,
} from "./actions";
import { AdjustmentForm, DiscardForm, FormCard, QuantityForm } from "./forms";

export default async function StockPage() {
  const actor = await requireUser();
  assertCan(actor, "stock.view");
  const balances = await getBalances();
  const hardware = balances.filter((b) => b.kind === "HERRAJE");
  const plates = balances.filter((b) => b.kind === "PLACA");
  const canMove = can(actor, "stock.move");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stock</h1>
        <Link href="/stock/movimientos" className="text-sm hover:underline">
          Ver movimientos →
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Herrajes (en el taller)</h2>
        <table className="w-full text-sm border rounded-md">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Material</th>
              <th className="p-2 text-right">Actual</th>
            </tr>
          </thead>
          <tbody>
            {hardware.map((b) => (
              <tr key={b.code} className="border-t">
                <td className="p-2">
                  {b.name} <span className="text-muted-foreground">({b.unit})</span>
                </td>
                <td className={`p-2 text-right ${b.taller < 0 ? "text-red-600 font-semibold" : ""}`}>{b.taller}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Placas</h2>
        <table className="w-full text-sm border rounded-md">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Placa</th>
              <th className="p-2 text-right">En Dalmata</th>
              <th className="p-2 text-right">En taller</th>
            </tr>
          </thead>
          <tbody>
            {plates.map((b) => (
              <tr key={b.code} className="border-t">
                <td className="p-2">{b.name}</td>
                <td className="p-2 text-right">{b.dalmata}</td>
                <td className="p-2 text-right">{b.taller}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {can(actor, "stock.registerArrival") && (
          <FormCard title="Llegaron placas a Dalmata">
            <QuantityForm action={plateArrivalAction} materials={plates} submit="Registrar llegada" />
          </FormCard>
        )}
        {canMove && (
          <>
            <FormCard title="Ingreso de herrajes">
              <QuantityForm action={ingresoAction} materials={hardware} submit="Registrar ingreso" />
            </FormCard>
            <FormCard title="Descarte por fallas (merma)">
              <DiscardForm action={discardAction} materials={hardware} />
            </FormCard>
            <FormCard title="Retiré placas de Dalmata">
              <QuantityForm action={platePickupAction} materials={plates} submit="Registrar retiro" />
            </FormCard>
            <FormCard title="Uso / descarte de placas en el taller">
              <QuantityForm action={plateUseAction} materials={plates} submit="Registrar uso" />
            </FormCard>
            <FormCard title="Ajuste por conteo">
              <AdjustmentForm action={adjustmentAction} materials={balances} />
            </FormCard>
          </>
        )}
      </section>
    </div>
  );
}
