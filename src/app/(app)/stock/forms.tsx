import { ActionForm } from "@/components/action-form";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action";

type Mat = { code: string; name: string };
type Action = (s: ActionState, fd: FormData) => Promise<ActionState>;

export function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="border rounded-md p-3 group">
      <summary className="cursor-pointer font-medium">{title}</summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

/** Formulario simple: material + cantidad + nota. */
export function QuantityForm({ action, materials, submit }: { action: Action; materials: Mat[]; submit: string }) {
  return (
    <ActionForm action={action} className="space-y-2">
      <NativeSelect name="materialCode" required>
        {materials.map((m) => (
          <option key={m.code} value={m.code}>
            {m.name}
          </option>
        ))}
      </NativeSelect>
      <Input name="quantity" type="number" min="1" step="1" placeholder="Cantidad" required inputMode="numeric" />
      <Input name="note" placeholder="Nota (opcional)" />
      <Button type="submit">{submit}</Button>
    </ActionForm>
  );
}

/** Descarte por lote: una fila por herraje, se cargan solo las que tengan cantidad. */
export function DiscardForm({ action, materials }: { action: Action; materials: Mat[] }) {
  return (
    <ActionForm action={action} className="space-y-2">
      {materials.map((m) => (
        <div key={m.code} className="flex items-center gap-2">
          <Label htmlFor={`qty_${m.code}`} className="w-40">
            {m.name}
          </Label>
          <Input id={`qty_${m.code}`} name={`qty_${m.code}`} type="number" min="0" step="1" className="w-24" inputMode="numeric" />
        </div>
      ))}
      <Input name="note" placeholder="Nota (opcional, ej. pedido #12)" />
      <Button type="submit">Descontar del stock</Button>
    </ActionForm>
  );
}

export function AdjustmentForm({ action, materials }: { action: Action; materials: (Mat & { kind: string })[] }) {
  return (
    <ActionForm action={action} className="space-y-2">
      <NativeSelect name="materialCode" required>
        {materials.map((m) => (
          <option key={m.code} value={m.code}>
            {m.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect name="location" defaultValue="TALLER">
        <option value="TALLER">En taller</option>
        <option value="DALMATA">En Dalmata (solo placas)</option>
      </NativeSelect>
      <Input name="delta" type="number" step="1" placeholder="Diferencia (+ o −)" required />
      <Input name="reason" placeholder="Motivo (obligatorio)" required />
      <Button type="submit">Ajustar</Button>
    </ActionForm>
  );
}
