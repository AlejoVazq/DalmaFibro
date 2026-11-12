"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth/current";
import { createUser, resetPassword, setUserActive } from "@/domain/users";
import { handle, str, type ActionState } from "@/lib/action";

export async function createUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    await createUser(actor, {
      username: str(fd, "username"),
      name: str(fd, "name"),
      role: str(fd, "role") as Role,
      password: str(fd, "password"),
    });
    revalidatePath("/usuarios");
    return { ok: "Usuario creado." };
  });
}

export async function toggleUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    await setUserActive(actor, str(fd, "userId"), str(fd, "active") === "true");
    revalidatePath("/usuarios");
  });
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    await resetPassword(actor, str(fd, "userId"), str(fd, "password"));
    return { ok: "Contraseña actualizada." };
  });
}
