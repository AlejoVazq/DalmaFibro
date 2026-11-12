"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Priority } from "@prisma/client";
import { requireUser } from "@/lib/auth/current";
import { cancelOrder, createOrder, setOrderStatus, updateOrder, type OrderInput } from "@/domain/orders";
import { MOCKUP_MAX_BYTES, MOCKUP_TYPES, saveMockup } from "@/domain/mockups";
import { handle, num, optStr, str, type ActionState } from "@/lib/action";
import { DomainError } from "@/lib/errors";

function orderInputFrom(fd: FormData): OrderInput {
  const count = num(fd, "lineCount");
  const lines = [];
  for (let i = 0; i < (Number.isFinite(count) ? count : 0); i++) {
    const boxTypeId = str(fd, `line_${i}_boxTypeId`);
    if (!boxTypeId) continue;
    lines.push({
      boxTypeId,
      quantity: num(fd, `line_${i}_quantity`),
      withLogo: str(fd, `line_${i}_withLogo`) === "on",
      engravingNotes: optStr(fd, `line_${i}_engravingNotes`),
    });
  }
  const desired = str(fd, "desiredDate");
  return {
    priority: (str(fd, "priority") || "MEDIA") as Priority,
    desiredDate: desired ? new Date(`${desired}T12:00:00-03:00`) : undefined,
    notes: optStr(fd, "notes"),
    lines,
  };
}

function filesFrom(fd: FormData): File[] {
  const files = fd.getAll("mockups").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.some((f) => !MOCKUP_TYPES.includes(f.type) || f.size > MOCKUP_MAX_BYTES)) {
    throw new DomainError("INVALID_FILE");
  }
  return files;
}

export async function createOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  let orderId = "";
  const res = await handle(async () => {
    const files = filesFrom(fd);
    const order = await createOrder(actor, orderInputFrom(fd));
    for (const file of files) await saveMockup(actor, { orderId: order.id, file });
    orderId = order.id;
  });
  if (res?.error) return res;
  revalidatePath("/pedidos");
  redirect(`/pedidos/${orderId}`);
}

export async function updateOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const id = str(fd, "orderId");
  const res = await handle(async () => {
    const files = filesFrom(fd);
    await updateOrder(actor, id, orderInputFrom(fd));
    for (const file of files) await saveMockup(actor, { orderId: id, file });
  });
  if (res?.error) return res;
  revalidatePath(`/pedidos/${id}`);
  redirect(`/pedidos/${id}`);
}

export async function uploadMockupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const id = str(fd, "orderId");
  return handle(async () => {
    const files = filesFrom(fd);
    for (const file of files) await saveMockup(actor, { orderId: id, orderLineId: optStr(fd, "orderLineId"), file });
    revalidatePath(`/pedidos/${id}`);
    return { ok: files.length ? "Archivos subidos." : "No elegiste archivos." };
  });
}

export async function setStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const id = str(fd, "orderId");
  return handle(async () => {
    await setOrderStatus(actor, id, str(fd, "to") as "EN_PRODUCCION" | "LISTO" | "RECIBIDO");
    revalidatePath(`/pedidos/${id}`);
    revalidatePath("/pedidos");
    revalidatePath("/");
  });
}

export async function cancelOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const id = str(fd, "orderId");
  return handle(async () => {
    await cancelOrder(actor, id);
    revalidatePath(`/pedidos/${id}`);
    revalidatePath("/pedidos");
    return { ok: "Pedido cancelado." };
  });
}
