import type { Priority } from "@prisma/client";
import { createOrder, setOrderStatus } from "@/domain/orders";
import type { SessionUser } from "@/lib/auth/permissions";
import { makeBoxType, makeUser } from "./factories";

/** Crea un pedido de `quantity` cajas (receta por defecto) y lo deja en el estado pedido. */
export async function makeOrder(
  opts: { quantity?: number; priority?: Priority; status?: "RECIBIDO" | "EN_PRODUCCION" | "LISTO"; price?: number } = {},
) {
  const dal = await makeUser("DALMATA");
  const papa: SessionUser = await makeUser("TALLER");
  const bt = await makeBoxType({ price: opts.price });
  const order = await createOrder(dal, {
    priority: opts.priority ?? "MEDIA",
    lines: [{ boxTypeId: bt.id, quantity: opts.quantity ?? 10, withLogo: true }],
  });
  const status = opts.status ?? "RECIBIDO";
  if (status !== "RECIBIDO") await setOrderStatus(papa, order.id, "EN_PRODUCCION");
  if (status === "LISTO") await setOrderStatus(papa, order.id, "LISTO");
  return { order, dal, papa, bt };
}
