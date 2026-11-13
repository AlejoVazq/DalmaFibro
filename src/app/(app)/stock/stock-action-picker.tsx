"use client";

import { useState } from "react";
import { ChevronLeft, ClipboardCheck, Droplets, Layers, PackagePlus, PackageX, Truck, Warehouse, type LucideIcon } from "lucide-react";
import type { StockActionInfo, StockActionKey } from "./stock-actions";

const ICONS: Record<StockActionKey, LucideIcon> = {
  ingreso: PackagePlus,
  retiro: Truck,
  uso: Layers,
  rotas: Droplets,
  descarte: PackageX,
  llegada: Warehouse,
  ajuste: ClipboardCheck,
};

type Props = { actions: StockActionInfo[]; forms: Partial<Record<StockActionKey, React.ReactNode>> };

/** "¿Qué pasó?": se elige una situación y aparece solo su formulario. */
export function StockActionPicker({ actions, forms }: Props) {
  const single = actions.length === 1 ? actions[0].key : null;
  const [selected, setSelected] = useState<StockActionKey | null>(single);
  const current = actions.find((a) => a.key === selected);

  if (current) {
    const Icon = ICONS[current.key];
    return (
      <section className="anim-in space-y-4 rounded-xl border-2 border-primary/25 bg-card p-4 sm:p-5">
        {!single && (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="-ml-1 inline-flex h-9 items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden /> Elegir otra cosa
          </button>
        )}
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{current.title}</h2>
            <p className="text-sm text-muted-foreground">{current.help}</p>
          </div>
        </div>
        {forms[current.key]}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">¿Qué pasó?</h2>
        <p className="text-sm text-muted-foreground">Elegí lo que querés anotar.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {actions.map((a) => {
          const Icon = ICONS[a.key];
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => setSelected(a.key)}
              className="flex flex-col items-start gap-2 rounded-xl border bg-card p-3 text-left sm:flex-row sm:gap-3 sm:p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block leading-snug font-semibold">{a.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground sm:text-sm">{a.help}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
