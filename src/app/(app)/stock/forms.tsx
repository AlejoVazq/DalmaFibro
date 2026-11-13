import { ActionForm } from "@/components/action-form";
import { NativeSelect } from "@/components/native-select";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action";

type Mat = { code: string; name: string };
type Action = (s: ActionState, fd: FormData) => Promise<ActionState>;

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/** Formulario simple: material + cantidad + nota. */
export function QuantityForm({ action, materials, submit, id }: { action: Action; materials: Mat[]; submit: string; id: string }) {
  return (
    <ActionForm action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field id={`${id}_mat`} label="¿Qué?">
          <NativeSelect id={`${id}_mat`} name="materialCode" required>
            {materials.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id={`${id}_qty`} label="¿Cuántos?">
          <Input id={`${id}_qty`} name="quantity" type="number" min="1" step="1" required inputMode="numeric" className="text-lg font-semibold" />
        </Field>
      </div>
      <Field id={`${id}_note`} label="Nota (opcional)">
        <Input id={`${id}_note`} name="note" />
      </Field>
      <SubmitButton className="w-full sm:w-auto">{submit}</SubmitButton>
    </ActionForm>
  );
}

const BREAKAGE = [
  { value: "DOBLADA", label: "Doblada" },
  { value: "HUMEDAD", label: "Humedad" },
  { value: "OTRO", label: "Otro" },
];

/** Placas rotas: placa + cantidad + motivo. «Otro» pide escribir qué pasó. */
export function BreakageForm({ action, materials }: { action: Action; materials: Mat[] }) {
  return (
    <ActionForm action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field id="rotas_mat" label="¿Qué placa?">
          <NativeSelect id="rotas_mat" name="materialCode" required>
            {materials.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="rotas_qty" label="¿Cuántas?">
          <Input id="rotas_qty" name="quantity" type="number" min="1" step="1" required inputMode="numeric" className="text-lg font-semibold" />
        </Field>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">¿Qué les pasó?</legend>
        <div className="grid grid-cols-3 gap-2">
          {BREAKAGE.map((r, i) => (
            <label
              key={r.value}
              className="flex h-11 cursor-pointer items-center justify-center rounded-lg border bg-card font-medium has-checked:border-primary has-checked:bg-accent"
            >
              <input type="radio" name="reason" value={r.value} defaultChecked={i === 0} className="sr-only" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="rotas_note" label="Detalle (obligatorio si elegiste «Otro»)">
        <Input id="rotas_note" name="note" />
      </Field>
      <SubmitButton className="w-full sm:w-auto">Descontar placas rotas</SubmitButton>
    </ActionForm>
  );
}

/** Descarte por lote: una fila por herraje, se cargan solo las que tengan cantidad. */
export function DiscardForm({ action, materials }: { action: Action; materials: Mat[] }) {
  return (
    <ActionForm action={action} className="space-y-3">
      <p className="text-sm text-muted-foreground">Completá solo los que tengan fallas; el resto dejalo vacío.</p>
      <div className="divide-y rounded-lg border">
        {materials.map((m) => (
          <div key={m.code} className="flex items-center gap-3 px-3 py-2">
            <Label htmlFor={`qty_${m.code}`} className="flex-1 font-normal">
              {m.name}
            </Label>
            <Input
              id={`qty_${m.code}`}
              name={`qty_${m.code}`}
              type="number"
              min="0"
              step="1"
              placeholder="0"
              className="w-24 text-center"
              inputMode="numeric"
            />
          </div>
        ))}
      </div>
      <Field id="discard_note" label="Nota (opcional)">
        <Input id="discard_note" name="note" placeholder="Ej.: pedido #12" />
      </Field>
      <SubmitButton className="w-full sm:w-auto">Descontar del stock</SubmitButton>
    </ActionForm>
  );
}

export function AdjustmentForm({ action, materials }: { action: Action; materials: (Mat & { kind: string })[] }) {
  return (
    <ActionForm action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="adj_mat" label="¿Qué material?">
          <NativeSelect id="adj_mat" name="materialCode" required>
            {materials.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="adj_loc" label="¿Dónde?">
          <NativeSelect id="adj_loc" name="location" defaultValue="TALLER">
            <option value="TALLER">En el taller</option>
            <option value="DALMATA">En Dalmata (solo placas)</option>
          </NativeSelect>
        </Field>
      </div>
      <Field id="adj_delta" label="Diferencia">
        <Input id="adj_delta" name="delta" type="number" step="1" required className="text-lg font-semibold sm:max-w-40" />
      </Field>
      <p className="-mt-1 text-sm text-muted-foreground">Ej.: 5 si sobran 5, −5 si faltan 5.</p>
      <Field id="adj_reason" label="Motivo">
        <Input id="adj_reason" name="reason" required placeholder="Ej.: conteo de fin de mes" />
      </Field>
      <SubmitButton className="w-full sm:w-auto">Guardar ajuste</SubmitButton>
    </ActionForm>
  );
}
