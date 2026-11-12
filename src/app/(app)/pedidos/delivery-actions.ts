"use server";

import { revalidatePath } from "next/cache";
import type { PickupType } from "@prisma/client";
import { requireUser } from "@/lib/auth/current";
import { annulDelivery, registerDelivery } from "@/domain/deliveries";
import { handle, num, str, type ActionState } from "@/lib/action";
import { fromLocalDateTime } from "@/lib/format";

export async function registerDeliveryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const orderId = str(fd, "orderId");
  return handle(async () => {
    const lineIds = fd.getAll("lineId").map(String);
    const when = str(fd, "deliveredAt");
    const { negativeStock } = await registerDelivery(actor, {
      orderId,
      requestId: str(fd, "requestId"),
      deliveredAt: when ? fromLocalDateTime(when) : new Date(),
      pickupType: str(fd, "pickupType") as PickupType,
      pickupName: str(fd, "pickupName"),
      lines: lineIds.map((id) => ({ orderLineId: id, quantity: num(fd, `qty_${id}`) || 0 })),
    });
    revalidatePath(`/pedidos/${orderId}`);
    revalidatePath("/pedidos");
    revalidatePath("/stock");
    revalidatePath("/");
    return {
      ok: "Entrega registrada y stock descontado.",
      warning: negativeStock.length
        ? `Atención: quedó stock negativo de ${negativeStock.join(", ")}. Revisá los ingresos.`
        : undefined,
    };
  });
}

export async function annulDeliveryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const orderId = str(fd, "orderId");
  return handle(async () => {
    await annulDelivery(actor, str(fd, "deliveryId"), str(fd, "reason"));
    revalidatePath(`/pedidos/${orderId}`);
    revalidatePath("/stock");
    return { ok: "Entrega anulada y stock devuelto." };
  });
}
