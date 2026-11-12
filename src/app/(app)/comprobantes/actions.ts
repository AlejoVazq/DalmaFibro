"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SurchargeMode } from "@prisma/client";
import { requireUser } from "@/lib/auth/current";
import {
  annulInvoice,
  createInvoiceFromDelivery,
  markInvoicePaid,
  markInvoiceSent,
  updateInvoiceLine,
} from "@/domain/invoices";
import { handle, num, optStr, str, type ActionState } from "@/lib/action";
import { fromLocalDateTime } from "@/lib/format";

function refresh(id: string) {
  revalidatePath(`/comprobantes/${id}`);
  revalidatePath("/comprobantes");
  revalidatePath("/comprobantes/saldo");
  revalidatePath("/");
}

export async function createInvoiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  let id = "";
  const res = await handle(async () => {
    id = (await createInvoiceFromDelivery(actor, str(fd, "deliveryId"))).id;
    revalidatePath(`/pedidos/${str(fd, "orderId")}`);
    refresh(id);
  });
  if (res?.error) return res;
  redirect(`/comprobantes/${id}`);
}

export async function updateLineAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const invoiceId = str(fd, "invoiceId");
  return handle(async () => {
    const mode = str(fd, "surchargeMode");
    const value = num(fd, "surchargeValue");
    await updateInvoiceLine(actor, str(fd, "lineId"), {
      unitPrice: num(fd, "unitPrice"),
      surchargeMode: mode ? (mode as SurchargeMode) : null,
      surchargeValue: Number.isNaN(value) ? 0 : value,
      surchargeReason: str(fd, "surchargeReason"),
    });
    refresh(invoiceId);
    return { ok: "Línea actualizada." };
  });
}

export async function markSentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const id = str(fd, "invoiceId");
  return handle(async () => {
    await markInvoiceSent(actor, id);
    refresh(id);
    return { ok: "Marcado como enviado." };
  });
}

export async function markPaidAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const id = str(fd, "invoiceId");
  return handle(async () => {
    const when = str(fd, "paidAt");
    await markInvoicePaid(actor, id, {
      paidAt: when ? fromLocalDateTime(when) : new Date(),
      paymentNote: optStr(fd, "paymentNote"),
    });
    refresh(id);
    return { ok: "Marcado como pagado." };
  });
}

export async function annulInvoiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const id = str(fd, "invoiceId");
  return handle(async () => {
    await annulInvoice(actor, id, str(fd, "reason"));
    refresh(id);
    revalidatePath("/pedidos", "layout");
    return { ok: "Comprobante anulado." };
  });
}
