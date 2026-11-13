import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_RECIPE, type Recipe } from "@/domain/catalog";

type Props = {
  closures: { code: string; name: string }[];
  values?: Recipe;
  /** Cajas que salen de una placa MDF negro; null = no usa. */
  blackPlate?: number | null;
};

/** Campos de receta de herrajes por caja. Vacío o 0 = no lleva. */
export function RecipeFields({ closures, values = DEFAULT_RECIPE, blackPlate = null }: Props) {
  const rows = [
    { code: "TORNILLO", name: "Tornillos" },
    { code: "BISAGRA", name: "Bisagras" },
    ...closures.map((c) => ({ code: c.code, name: `${c.name} (pares)` })),
  ] as const;
  return (
    <fieldset className="space-y-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">Herrajes que lleva cada caja</legend>
      <p className="text-sm text-muted-foreground">Se descuentan del stock al entregar. 0 = no lleva.</p>
      {rows.map((r) => (
        <div key={r.code} className="flex items-center gap-3">
          <Label htmlFor={`recipe_${r.code}`} className="flex-1 font-normal">
            {r.name}
          </Label>
          <Input
            id={`recipe_${r.code}`}
            name={`recipe_${r.code}`}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            className="w-24 text-center"
            defaultValue={values[r.code as keyof Recipe] ?? 0}
          />
        </div>
      ))}
      <div className="space-y-1.5 border-t pt-3">
        <div className="flex items-center gap-3">
          <Label htmlFor="boxesPerBlackPlate" className="flex-1 font-normal">
            Cajas que salen de una placa MDF negro
          </Label>
          <Input
            id="boxesPerBlackPlate"
            name="boxesPerBlackPlate"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="—"
            className="w-24 text-center"
            defaultValue={blackPlate ?? ""}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Al entregar se descuentan las placas solas, redondeando para arriba. Dejalo vacío si esta caja no lleva placa negra.
        </p>
      </div>
    </fieldset>
  );
}
