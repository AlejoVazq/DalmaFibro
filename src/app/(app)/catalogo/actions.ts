"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current";
import { createBoxType, renameMaterial, setPrice, updateBoxType, type Recipe } from "@/domain/catalog";
import { handle, num, str, type ActionState } from "@/lib/action";
import { MATERIALS } from "@/lib/materials";

function recipeFrom(fd: FormData): Recipe {
  const recipe: Recipe = {};
  for (const m of MATERIALS.filter((x) => x.kind === "HERRAJE")) {
    const q = num(fd, `recipe_${m.code}`);
    if (Number.isFinite(q) && q > 0) recipe[m.code] = q;
  }
  return recipe;
}

export async function createBoxTypeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    await createBoxType(actor, { name: str(fd, "name"), unitPrice: num(fd, "unitPrice"), recipe: recipeFrom(fd) });
    revalidatePath("/catalogo");
    return { ok: "Tipo de caja creado." };
  });
}

export async function updateBoxTypeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const id = str(fd, "id");
  return handle(async () => {
    await updateBoxType(actor, id, {
      name: str(fd, "name"),
      active: fd.get("active") === "on",
      recipe: recipeFrom(fd),
    });
    revalidatePath(`/catalogo/${id}`);
    revalidatePath("/catalogo");
  });
}

export async function setPriceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const id = str(fd, "id");
  return handle(async () => {
    const from = str(fd, "validFrom");
    await setPrice(actor, id, num(fd, "unitPrice"), from ? new Date(`${from}T00:00:00-03:00`) : new Date());
    revalidatePath(`/catalogo/${id}`);
    revalidatePath("/catalogo");
    return { ok: "Precio actualizado." };
  });
}

export async function renameMaterialAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    await renameMaterial(actor, str(fd, "code") as "CIERRE_A" | "CIERRE_B", str(fd, "name"));
    revalidatePath("/catalogo");
  });
}
