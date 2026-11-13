import { History } from "lucide-react";
import { requireUser } from "@/lib/auth/current";
import { assertCan } from "@/lib/auth/permissions";
import { getStockOverview } from "@/domain/commitments";
import { LinkButton } from "@/components/link-button";
import { PageHeader } from "@/components/page-header";
import { StockLevelChip } from "@/components/stock-level-chip";
import { stockLevel } from "@/domain/stock-levels";
import {
  adjustmentAction,
  discardAction,
  ingresoAction,
  plateBreakageAction,
  plateArrivalAction,
  platePickupAction,
  plateUseAction,
} from "./actions";
import { AdjustmentForm, BreakageForm, DiscardForm, QuantityForm } from "./forms";
import { StockActionPicker } from "./stock-action-picker";
import { stockActionsFor } from "./stock-actions";

export default async function StockPage() {
  const actor = await requireUser();
  assertCan(actor, "stock.view");
  const { hardware, plates, all: balances } = await getStockOverview();
  const actions = stockActionsFor(actor);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Stock"
        description="Herrajes y placas: cuánto hay y qué hace falta."
        actions={
          <LinkButton href="/stock/movimientos" variant="outline">
            <History aria-hidden /> Ver movimientos
          </LinkButton>
        }
      />

      {actions.length > 0 && (
        <StockActionPicker
          actions={actions}
          forms={{
            ingreso: <QuantityForm id="ingreso" action={ingresoAction} materials={hardware} submit="Sumar al stock" />,
            retiro: <QuantityForm id="retiro" action={platePickupAction} materials={plates} submit="Registrar retiro" />,
            uso: <QuantityForm id="uso" action={plateUseAction} materials={plates} submit="Descontar placas" />,
            rotas: <BreakageForm action={plateBreakageAction} materials={plates} />,
            descarte: <DiscardForm action={discardAction} materials={hardware} />,
            llegada: <QuantityForm id="llegada" action={plateArrivalAction} materials={plates} submit="Registrar llegada" />,
            ajuste: <AdjustmentForm action={adjustmentAction} materials={balances} />,
          }}
        />
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Herrajes en el taller</h2>
          <p className="text-sm text-muted-foreground">
            <strong>Reservado</strong> es lo que van a usar los pedidos abiertos. <strong>Libre</strong> es lo que queda.
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {hardware.map((b) => {
            const level = stockLevel(b.code, b.available);
            const short = level === "falta" || level === "critico";
            const low = level === "bajo";
            return (
              <li
                key={b.code}
                className={`rounded-xl border bg-card p-4 ${short ? "border-destructive/50 bg-destructive/5" : low ? "border-warning/50 bg-warning/5" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">
                    {b.name} <span className="font-normal text-muted-foreground">({b.unit})</span>
                  </div>
                  <StockLevelChip level={level} available={b.available} />
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-2">
                    <dt className="text-xs text-muted-foreground">Hay</dt>
                    <dd className={`text-lg font-semibold ${b.taller < 0 ? "text-destructive" : ""}`}>{b.taller}</dd>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <dt className="text-xs text-muted-foreground">Reservado</dt>
                    <dd className="text-lg font-semibold">{b.committed}</dd>
                  </div>
                  <div className={`rounded-lg p-2 ${short ? "bg-destructive/10" : low ? "bg-warning/10" : "bg-success/10"}`}>
                    <dt className="text-xs text-muted-foreground">Libre</dt>
                    <dd className={`text-lg font-semibold ${short ? "text-destructive" : low ? "text-warning" : "text-success"}`}>{b.available}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Placas</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {plates.map((b) => (
            <li key={b.code} className="rounded-xl border bg-card p-4">
              <div className="font-semibold">{b.name}</div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-muted p-2">
                  <dt className="text-xs text-muted-foreground">En Dalmata</dt>
                  <dd className="text-lg font-semibold">{b.dalmata}</dd>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <dt className="text-xs text-muted-foreground">En el taller</dt>
                  <dd className="text-lg font-semibold">{b.taller}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
