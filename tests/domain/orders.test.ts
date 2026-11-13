import { prisma } from "@/lib/db";
import {
  createOrder,
  updateOrder,
  cancelOrder,
  setOrderStatus,
  listOrders,
  getOrder,
  getPendingByLine,
} from "@/domain/orders";
import { ForbiddenError } from "@/lib/errors";
import { resetDb } from "../helpers/db";
import { makeBoxType, makeUser } from "../helpers/factories";
import { makeOrder } from "../helpers/orders";

beforeEach(resetDb);

test("Dalmata no puede editar un pedido en producción", async () => {
  const dal = await makeUser("DALMATA");
  const papa = await makeUser("TALLER");
  const bt = await makeBoxType();
  const o = await createOrder(dal, {
    materialsOrdered: true,
    priority: "ALTA",
    lines: [{ boxTypeId: bt.id, quantity: 10, withLogo: true }],
  });
  await setOrderStatus(papa, o.id, "EN_PRODUCCION");
  await expect(
    updateOrder(dal, o.id, {
      materialsOrdered: true,
      priority: "BAJA",
      lines: [{ boxTypeId: bt.id, quantity: 5, withLogo: false }],
    }),
  ).rejects.toMatchObject({ code: "ORDER_LOCKED" });
  await expect(cancelOrder(dal, o.id)).rejects.toMatchObject({
    code: "ORDER_LOCKED",
  });
});

test("Dalmata edita un pedido recibido; el taller uno en producción", async () => {
  const { order, dal, papa, bt } = await makeOrder();
  await updateOrder(dal, order.id, {
    materialsOrdered: true,
    priority: "BAJA",
    notes: "cambio",
    lines: [
      {
        boxTypeId: bt.id,
        quantity: 7,
        withLogo: false,
        engravingNotes: "centrado",
      },
    ],
  });
  let full = await getOrder(dal, order.id);
  expect(full.priority).toBe("BAJA");
  expect(full.lines).toHaveLength(1);
  expect(full.lines[0].quantity).toBe(7);
  await setOrderStatus(papa, order.id, "EN_PRODUCCION");
  await updateOrder(papa, order.id, {
    materialsOrdered: true,
    priority: "ALTA",
    lines: [{ boxTypeId: bt.id, quantity: 8, withLogo: true }],
  });
  full = await getOrder(papa, order.id);
  expect(full.lines[0].quantity).toBe(8);
});

test("DALMATA no puede cambiar estados", async () => {
  const { order, dal } = await makeOrder();
  await expect(
    setOrderStatus(dal, order.id, "EN_PRODUCCION"),
  ).rejects.toBeInstanceOf(ForbiddenError);
});

test("transición LISTO -> RECIBIDO es inválida", async () => {
  const { order, papa } = await makeOrder({ status: "LISTO" });
  await expect(
    setOrderStatus(papa, order.id, "RECIBIDO"),
  ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  await setOrderStatus(papa, order.id, "EN_PRODUCCION");
});

test("validaciones de líneas", async () => {
  const dal = await makeUser("DALMATA");
  const bt = await makeBoxType();
  await expect(
    createOrder(dal, { materialsOrdered: true, priority: "ALTA", lines: [] }),
  ).rejects.toMatchObject({ code: "EMPTY_ORDER" });
  await expect(
    createOrder(dal, {
      materialsOrdered: true,
      priority: "ALTA",
      lines: [{ boxTypeId: bt.id, quantity: 0, withLogo: true }],
    }),
  ).rejects.toMatchObject({ code: "INVALID_QUANTITY" });
  await prisma.boxType.update({
    where: { id: bt.id },
    data: { active: false },
  });
  await expect(
    createOrder(dal, {
      materialsOrdered: true,
      priority: "ALTA",
      lines: [{ boxTypeId: bt.id, quantity: 1, withLogo: true }],
    }),
  ).rejects.toMatchObject({ code: "INACTIVE_BOX_TYPE" });
});

test("orden de la lista: abiertos primero, ALTA antes que BAJA, luego antigüedad", async () => {
  const dal = await makeUser("DALMATA");
  const bt = await makeBoxType();
  const line = [{ boxTypeId: bt.id, quantity: 1, withLogo: true }];
  const a = await createOrder(dal, {
    materialsOrdered: true,
    priority: "BAJA",
    lines: line,
  });
  const b = await createOrder(dal, {
    materialsOrdered: true,
    priority: "ALTA",
    lines: line,
  });
  const c = await createOrder(dal, {
    materialsOrdered: true,
    priority: "ALTA",
    lines: line,
  });
  const d = await createOrder(dal, {
    materialsOrdered: true,
    priority: "ALTA",
    lines: line,
  });
  await cancelOrder(dal, d.id);
  const ids = (await listOrders(dal, {})).map((o) => o.id);
  expect(ids).toEqual([b.id, c.id, a.id, d.id]);
});

test("cancelar y pendientes por línea", async () => {
  const { order, papa } = await makeOrder({ quantity: 12 });
  const pending = await getPendingByLine(order.id);
  expect([...pending.values()]).toEqual([12]);
  await setOrderStatus(papa, order.id, "EN_PRODUCCION");
  await cancelOrder(papa, order.id);
  expect((await getOrder(papa, order.id)).status).toBe("CANCELADO");
});
