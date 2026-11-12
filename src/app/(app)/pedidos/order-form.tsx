"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/action";

type Line = { boxTypeId: string; quantity: number | ""; withLogo: boolean; engravingNotes: string };

type Props = {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  boxTypes: { id: string; name: string }[];
  orderId?: string;
  initial?: { priority: string; desiredDate: string; notes: string; lines: Line[] };
  submitLabel: string;
};

const emptyLine = (boxTypeId: string): Line => ({ boxTypeId, quantity: "", withLogo: true, engravingNotes: "" });

export function OrderForm({ action, boxTypes, orderId, initial, submitLabel }: Props) {
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? [emptyLine(boxTypes[0]?.id ?? "")]);
  const update = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <ActionForm action={action} className="space-y-5" resetOnSuccess={false}>
      {orderId && <input type="hidden" name="orderId" value={orderId} />}
      <input type="hidden" name="lineCount" value={lines.length} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="priority">Prioridad</Label>
          <NativeSelect id="priority" name="priority" defaultValue={initial?.priority ?? "MEDIA"}>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="desiredDate">Fecha deseada (opcional)</Label>
          <Input id="desiredDate" name="desiredDate" type="date" defaultValue={initial?.desiredDate} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">Cajas</h2>
        {lines.map((l, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1 flex-1 min-w-40">
                <Label>Tipo de caja</Label>
                <NativeSelect
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
              <div className="space-y-1 w-28">
                <Label>Cantidad</Label>
                <Input
                  name={`line_${i}_quantity`}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={l.quantity}
                  onChange={(e) => update(i, { quantity: e.target.value === "" ? "" : Number(e.target.value) })}
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm h-9">
                <input
                  type="checkbox"
                  name={`line_${i}_withLogo`}
                  checked={l.withLogo}
                  onChange={(e) => update(i, { withLogo: e.target.checked })}
                />
                Con logo grabado
              </label>
              {lines.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                >
                  Quitar
                </Button>
              )}
            </div>
            {l.withLogo && (
              <Input
                name={`line_${i}_engravingNotes`}
                placeholder="Detalle del grabado: tamaño, posición (centrado, esquina)…"
                value={l.engravingNotes}
                onChange={(e) => update(i, { engravingNotes: e.target.value })}
              />
            )}
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setLines((ls) => [...ls, emptyLine(boxTypes[0]?.id ?? "")])}>
          + Agregar otro tipo de caja
        </Button>
      </div>

      <div className="space-y-1">
        <Label htmlFor="mockups">Mockups (PNG, JPG, WEBP o PDF, hasta 20 MB c/u)</Label>
        <Input id="mockups" name="mockups" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Observaciones</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes} />
      </div>

      <Button type="submit">{submitLabel}</Button>
    </ActionForm>
  );
}
