import { DomainError, ForbiddenError } from "@/lib/errors";
import { messageFor } from "@/lib/messages";

export type ActionState = { error?: string; ok?: string; warning?: string } | undefined;

/** Ejecuta una acción de dominio y traduce los errores conocidos a mensajes para la UI. */
export async function handle(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: "Guardado." };
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: e.message };
    if (e instanceof DomainError) return { error: messageFor(e.code) };
    throw e;
  }
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(fd: FormData, key: string): string | undefined {
  return str(fd, key) || undefined;
}

export function num(fd: FormData, key: string): number {
  const s = str(fd, key).replace(",", ".");
  return s === "" ? NaN : Number(s);
}
