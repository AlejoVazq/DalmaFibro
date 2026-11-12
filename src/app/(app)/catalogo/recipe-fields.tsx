import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_RECIPE, type Recipe } from "@/domain/catalog";

type Props = {
  closures: { code: string; name: string }[];
  values?: Recipe;
};

/** Campos de receta de herrajes por caja. Vacío o 0 = no lleva. */
export function RecipeFields({ closures, values = DEFAULT_RECIPE }: Props) {
  const rows = [
    { code: "TORNILLO", name: "Tornillos" },
    { code: "BISAGRA", name: "Bisagras" },
    ...closures.map((c) => ({ code: c.code, name: `${c.name} (pares)` })),
  ] as const;
  return (
    <fieldset className="border rounded-md p-3 space-y-2">
      <legend className="text-sm px-1">Herrajes por caja</legend>
      {rows.map((r) => (
        <div key={r.code} className="flex items-center gap-2">
          <Label htmlFor={`recipe_${r.code}`} className="w-48">
            {r.name}
          </Label>
          <Input
            id={`recipe_${r.code}`}
            name={`recipe_${r.code}`}
            type="number"
            min="0"
            step="1"
            className="w-24"
            defaultValue={values[r.code as keyof Recipe] ?? 0}
          />
        </div>
      ))}
    </fieldset>
  );
}
