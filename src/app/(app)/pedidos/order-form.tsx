"use client";

import { useEffect, useRef, useState } from "react";
import { PackageSearch, Plus, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { NativeSelect } from "@/components/native-select";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/utils";
import type { Shortage } from "@/domain/shortage";
import { previewShortageAction } from "./actions";

type Line = { boxTypeId: string; quantity: number | ""; withLogo: boolean; engravingNotes: string };

type Props = {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  boxTypes: { id: string; name: string }[];
  orderId?: string;
  initial?: { priority: string; desiredDate: string; notes: string; lines: Line[] };
  submitLabel: string;
};

const emptyLine = (boxTypeId: string): Line => ({ boxTypeId, quantity: "", withLogo: true, engravingNotes: "" });

const PRIORITIES = [
  { value: "ALTA", label: "Alta", hint: "Lo antes posible", cls: "has-checked:border-destructive has-checked:bg-destructive/10" },
  { value: "MEDIA", label: "Media", hint: "Normal", cls: "has-checked:border-warning has-checked:bg-warning/10" },
  { value: "BAJA", label: "Baja", hint: "Sin apuro", cls: "has-checked:border-foreground/40 has-checked:bg-muted" },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="flex items-center gap-3 text-lg font-semibold">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function OrderForm({ action, boxTypes, orderId, initial, submitLabel }: Props) {
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? [emptyLine(boxTypes[0]?.id ?? "")]);
  const update = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
  const [shortage, setShortage] = useState<Shortage[]>([]);
  const [ordered, setOrdered] = useState(false);
  const request = useRef(0);
  const linesKey = JSON.stringify(lines.map((l) => [l.boxTypeId, l.quantity]));
  useEffect(() => {
    const id = ++request.current;
    const t = setTimeout(async () => {
      const res = await previewShortageAction(
        lines.map((l) => ({ boxTypeId: l.boxTypeId, quantity: Number(l.quantity) })),
        orderId,
      ).catch(() => null);
      if (res && id === request.current) setShortage(res);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- linesKey resume las cantidades
  }, [linesKey, orderId]);
  const blocked = shortage.length > 0 && !ordered;

  return (
    <ActionForm action={action} className="space-y-5" resetOnSuccess={false}>
      {orderId && <input type="hidden" name="orderId" value={orderId} />}
      <input type="hidden" name="lineCount" value={lines.length} />

      <Step n={1} title="¿Qué cajas?">
        {lines.map((l, i) => (
          <div key={i} className="space-y-3 rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">Caja {i + 1}</span>
              {lines.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                >
                  <Trash2 aria-hidden /> Quitar
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <div className="space-y-1.5">
                <Label htmlFor={`line_${i}_boxTypeId`}>Tipo de caja</Label>
                <NativeSelect
                  id={`line_${i}_boxTypeId`}
                  name={`line_${i}_boxTypeId`}
                  value={l.boxTypeId}
                  onChange={(e) => update(i, { boxTypeId: e.target.value })}
                  required
                >
                  {boxTypes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`line_${i}_quantity`}>Cantidad</Label>
                <Input
                  id={`line_${i}_quantity`}
                  name={`line_${i}_quantity`}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                  className="text-lg font-semibold"
                  value={l.quantity}
                  onChange={(e) => update(i, { quantity: e.target.value === "" ? "" : Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 has-checked:border-primary has-checked:bg-accent">
              <input
                type="checkbox"
                className="size-5 accent-[var(--primary)]"
                name={`line_${i}_withLogo`}
                checked={l.withLogo}
                onChange={(e) => update(i, { withLogo: e.target.checked })}
              />
              <span className="font-medium">Con logo grabado</span>
            </label>
            {l.withLogo && (
              <div className="anim-in space-y-1.5">
                <Label htmlFor={`line_${i}_engravingNotes`}>Detalle del grabado (opcional)</Label>
                <Input
                  id={`line_${i}_engravingNotes`}
                  name={`line_${i}_engravingNotes`}
                  placeholder="Tamaño, posición (centrado, esquina)…"
                  value={l.engravingNotes}
                  onChange={(e) => update(i, { engravingNotes: e.target.value })}
                />
              </div>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => setLines((ls) => [...ls, emptyLine(boxTypes[0]?.id ?? "")])}>
            <Plus aria-hidden /> Agregar otro tipo de caja
          </Button>
          {total > 0 && <span className="text-sm text-muted-foreground">Total: <strong className="text-foreground">{total} cajas</strong></span>}
        </div>
      </Step>

      <Step n={2} title="Detalles">
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-sm font-medium">Prioridad</legend>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITIES.map((p) => (
              <label
                key={p.value}
                className={cn("flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border bg-background px-2 py-2 text-center has-focus-visible:ring-3 has-focus-visible:ring-ring/50", p.cls)}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p.value}
                  defaultChecked={(initial?.priority ?? "MEDIA") === p.value}
                  className="sr-only"
                />
                <span className="font-semibold">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1.5 sm:max-w-xs">
          <Label htmlFor="desiredDate">¿Para cuándo lo necesitás? (opcional)</Label>
          <Input id="desiredDate" name="desiredDate" type="date" defaultValue={initial?.desiredDate} />
        </div>
      </Step>

      <Step n={3} title="Mockups y observaciones">
        <div className="space-y-1.5">
          <Label htmlFor="mockups">Mockups (opcional)</Label>
          <Input id="mockups" name="mockups" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" />
          <p className="text-sm text-muted-foreground">Fotos o PDF del diseño, hasta 20 MB cada uno. Podés elegir varios.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Observaciones (opcional)</Label>
          <Textarea id="notes" name="notes" defaultValue={initial?.notes} placeholder="Algo más que el taller tenga que saber" />
        </div>
      </Step>

      {shortage.length > 0 && (
        <section
          aria-live="polite"
          className="anim-in space-y-3 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <PackageSearch className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold">No alcanzan los herrajes</h2>
              <p className="text-sm text-muted-foreground">
                Con lo que ya está reservado para otros pedidos, para este faltan:
              </p>
            </div>
          </div>
          <ul className="space-y-1 pl-1 text-base">
            {shortage.map((s) => (
              <li key={s.code}>
                <strong>{s.missing}</strong> {s.name.toLowerCase()}
              </li>
            ))}
          </ul>
          <p className="text-sm">Primero encargá estos materiales. Cuando estén encargados, marcalo acá para poder guardar el pedido.</p>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 font-medium has-checked:border-success has-checked:bg-success/10">
            <input
              type="checkbox"
              name="materialsOrdered"
              checked={ordered}
              onChange={(e) => setOrdered(e.target.checked)}
              className="size-5 accent-[var(--color-success)]"
            />
            Ya encargué los materiales que faltan
          </label>
        </section>
      )}

      <SubmitButton size="lg" className="w-full sm:w-auto" disabled={blocked}>
        {submitLabel}
      </SubmitButton>
      {blocked && <p className="text-sm text-muted-foreground">Para guardar, marcá que ya encargaste los materiales.</p>}
    </ActionForm>
  );
}
