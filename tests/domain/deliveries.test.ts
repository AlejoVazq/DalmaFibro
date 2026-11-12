import { prisma } from "@/lib/db";
import { registerDelivery, annulDelivery } from "@/domain/deliveries";
import { registerIngreso } from "@/domain/stock";
import { ForbiddenError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth/permissions";
import { resetDb } from "../helpers/db";
import { makeUser } from "../helpers/factories";
import { makeOrder } from "../helpers/orders";
import { balanceOf } from "../helpers/stock";

beforeEach(resetDb);

async function stock(papa: SessionUser) {
  await registerIngreso(papa, { materialCode: "TORNILLO", quantity: 1000 });
  await registerIngreso(papa, { materialCode: "BISAGRA", quantity: 100 });
  await registerIngreso(papa, { materialCode: "CIERRE_A", quantity: 50 });
}

const base = { deliveredAt: new Date(), pickupType: "FLETERO" as const, pickupName: "Juan" };
const statusOf = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;

test("entrega completa descuenta receta × cantidad y cierra el pedido", async () => {
  const { order, papa } = await makeOrder({ quantity: 10, status: "LISTO" });
  await stock(papa);
  const r = await registerDelivery(papa, { ...base, orderId: order.id, requestId: "r1" });
  expect((await balanceOf("TORNILLO")).taller).toBe(880);
  expect((await balanceOf("BISAGRA")).taller).toBe(80);
  expect((await balanceOf("CIERRE_A")).taller).toBe(40);
  expect(await statusOf(order.id)).toBe("ENTREGADO");
  expect(r.negativeStock).toEqual([]);
  expect(r.delivery.pickupName).toBe("Juan");
});

test("entrega parcial: 60 de 100 -> PARCIAL; luego 40 -> ENTREGADO", async () => {
  const { order, papa } = await makeOrder({ quantity: 100, status: "LISTO" });
  const line = (await prisma.orderLine.findFirstOrThrow({ where: { orderId: order.id } })).id;
  await registerDelivery(papa, { ...base, orderId: order.id, requestId: "p1", lines: [{ orderLineId: line, quantity: 60 }] });
  expect(await statusOf(order.id)).toBe("PARCIAL");
  expect((await balanceOf("TORNILLO")).taller).toBe(-720);
  await registerDelivery(papa, { ...base, orderId: order.id, requestId: "p2" });
  expect(await statusOf(order.id)).toBe("ENTREGADO");
  expect((await balanceOf("TORNILLO")).taller).toBe(-1200);
});

test("mismo requestId dos veces descuenta una sola vez", async () => {
  const { order, papa } = await makeOrder({ quantity: 10, status: "LISTO" });
  const line = (await prisma.orderLine.findFirstOrThrow({ where: { orderId: order.id } })).id;
  const input = { ...base, orderId: order.id, requestId: "dup", lines: [{ orderLineId: line, quantity: 4 }] };
  const [a, b] = await Promise.all([registerDelivery(papa, input), registerDelivery(papa, input)]);
  expect(a.delivery.id).toBe(b.delivery.id);
  expect(await prisma.delivery.count()).toBe(1);
  expect((await balanceOf("TORNILLO")).taller).toBe(-48);
});

test("entregar 11 de 10 -> OVER_DELIVERY", async () => {
  const { order, papa } = await makeOrder({ quantity: 10, status: "LISTO" });
  const line = (await prisma.orderLine.findFirstOrThrow({ where: { orderId: order.id } })).id;
  await expect(
    registerDelivery(papa, { ...base, orderId: order.id, requestId: "o1", lines: [{ orderLineId: line, quantity: 11 }] }),
  ).rejects.toMatchObject({ code: "OVER_DELIVERY" });
  expect(await prisma.stockMovement.count()).toBe(0);
});

test("línea de otro pedido -> NOT_FOUND", async () => {
  const a = await makeOrder({ status: "LISTO" });
  const b = await makeOrder({ status: "LISTO" });
  const lineB = (await prisma.orderLine.findFirstOrThrow({ where: { orderId: b.order.id } })).id;
  await expect(
    registerDelivery(a.papa, { ...base, orderId: a.order.id, requestId: "x", lines: [{ orderLineId: lineB, quantity: 1 }] }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("DALMATA no puede registrar entregas", async () => {
  const { order, dal } = await makeOrder({ status: "LISTO" });
  await expect(registerDelivery(dal, { ...base, orderId: order.id, requestId: "d" })).rejects.toBeInstanceOf(ForbiddenError);
});

test("pedido RECIBIDO -> ORDER_NOT_DELIVERABLE; sin nombre -> PICKUP_NAME_REQUIRED", async () => {
  const { order, papa } = await makeOrder();
  await expect(registerDelivery(papa, { ...base, orderId: order.id, requestId: "n" })).rejects.toMatchObject({
    code: "ORDER_NOT_DELIVERABLE",
  });
  const other = await makeOrder({ status: "LISTO" });
  await expect(
    registerDelivery(papa, { ...base, pickupName: "  ", orderId: other.order.id, requestId: "m" }),
  ).rejects.toMatchObject({ code: "PICKUP_NAME_REQUIRED" });
});

test("stock insuficiente: se registra y avisa en negativeStock", async () => {
  const { order, papa } = await makeOrder({ quantity: 10, status: "EN_PRODUCCION" });
  await registerIngreso(papa, { materialCode: "TORNILLO", quantity: 1000 });
  const r = await registerDelivery(papa, { ...base, orderId: order.id, requestId: "neg" });
  expect(r.negativeStock.sort()).toEqual(["Bisagras", "Cierre tipo A"]);
});

test("anular entrega revierte el stock y vuelve el pedido a LISTO", async () => {
  const { order, papa } = await makeOrder({ quantity: 10, status: "LISTO" });
  await stock(papa);
  const admin = await makeUser("ADMIN");
  const { delivery } = await registerDelivery(papa, { ...base, orderId: order.id, requestId: "a1" });
  await annulDelivery(admin, delivery.id, "cargada por error");
  expect((await balanceOf("TORNILLO")).taller).toBe(1000);
  expect(await statusOf(order.id)).toBe("LISTO");
  expect(await prisma.stockMovement.count({ where: { type: "REVERSION" } })).toBe(3);
  await expect(annulDelivery(admin, delivery.id, "otra vez")).rejects.toMatchObject({ code: "ALREADY_ANNULLED" });
});

test("TALLER no puede anular entregas", async () => {
  const { order, papa } = await makeOrder({ status: "LISTO" });
  const { delivery } = await registerDelivery(papa, { ...base, orderId: order.id, requestId: "t" });
  await expect(annulDelivery(papa, delivery.id, "x")).rejects.toBeInstanceOf(ForbiddenError);
});
