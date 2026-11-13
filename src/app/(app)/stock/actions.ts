"use server";

import { revalidatePath } from "next/cache";
import type { Location } from "@prisma/client";
import { requireUser } from "@/lib/auth/current";
import {
  registerAdjustment,
  registerDiscard,
  registerIngreso,
  registerPlateArrival,
  registerPlatePickup,
  registerPlateUse,
  registerPlateBreakage,
  type BreakageReason,
} from "@/domain/stock";
import { handle, num, optStr, str, type ActionState } from "@/lib/action";
import { MATERIALS, type MaterialCode } from "@/lib/materials";

const done = (msg: string): ActionState => {
  revalidatePath("/stock");
  revalidatePath("/");
  return { ok: msg };
};

const code = (fd: FormData) => str(fd, "materialCode") as MaterialCode;

export async function ingresoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    await registerIngreso(actor, { materialCode: code(fd), quantity: num(fd, "quantity"), note: optStr(fd, "note") });
    return done("Ingreso registrado.");
  });
}

export async function discardAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    const items = MATERIALS.filter((m) => m.kind === "HERRAJE")
      .map((m) => ({ materialCode: m.code, quantity: num(fd, `qty_${m.code}`) }))
      .filter((i) => Number.isFinite(i.quantity) && i.quantity !== 0);
    await registerDiscard(actor, { items, note: optStr(fd, "note") });
    return done("Descarte registrado y descontado del stock.");
  });
}

export async function adjustmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    await registerAdjustment(actor, {
      materialCode: code(fd),
      location: (str(fd, "location") || "TALLER") as Location,
      delta: num(fd, "delta"),
      reason: str(fd, "reason"),
    });
    return done("Ajuste registrado.");
  });
}

export async function plateArrivalAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    await registerPlateArrival(actor, { materialCode: code(fd), quantity: num(fd, "quantity"), note: optStr(fd, "note") });
    return done("Llegada de placas registrada.");
  });
}

export async function platePickupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    await registerPlatePickup(actor, { materialCode: code(fd), quantity: num(fd, "quantity"), note: optStr(fd, "note") });
    return done("Retiro de placas registrado.");
  });
}

export async function plateBreakageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    await registerPlateBreakage(actor, {
      materialCode: code(fd),
      quantity: num(fd, "quantity"),
      reason: str(fd, "reason") as BreakageReason,
      note: optStr(fd, "note"),
    });
    return done("Placas rotas descontadas.");
  });
}

export async function plateUseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  return handle(async () => {
    await registerPlateUse(actor, { materialCode: code(fd), quantity: num(fd, "quantity"), note: optStr(fd, "note") });
    return done("Uso de placas registrado.");
  });
}
