import { prisma } from "@/lib/db";
import { annulDelivery, registerDelivery } from "@/domain/deliveries";
import { createBoxType, getBoxTypeDetail, updateBoxType } from "@/domain/catalog";
import { registerIngreso, registerPlateArrival, registerPlateBreakage, registerPlatePickup } from "@/domain/stock";
import { resetDb } from "../helpers/db";
import { makeUser } from "../helpers/factories";
import { makeOrder } from "../helpers/orders";
import { balanceOf } from "../helpers/stock";

beforeEach(resetDb);

const base = { deliveredAt: new Date(), pickupType: "FLETERO" as const, pickupName: "Juan" };

async function stock(papa: Awaited<ReturnType<typeof makeUser>>, dal: Awaited<ReturnType<typeof makeUser>>) {
  await registerIngreso(papa, { materialCode: "TORNILLO", quantity: 5000 });
  await registerIngreso(papa, { materialCode: "BISAGRA", quantity: 500 });
  await registerIngreso(papa, { materialCode: "CIERRE_A", quantity: 500 });
  await registerPlateArrival(dal, { materialCode: "PLACA_MDF_NEGRO", quantity: 30 });
  await registerPlatePickup(papa, { materialCode: "PLACA_MDF_NEGRO", quantity: 30 });
}

test("entregar cajas que usan placa negra descuenta placas redondeando para arriba", async () => {
  const { order, papa, dal } = await makeOrder({ quantity: 150, status: "LISTO", boxesPerBlackPlate: 12 });
  await stock(papa, dal);
  await registerDelivery(papa, { ...base, orderId: order.id, requestId: "r1" });
  // 150 / 12 = 12,5 → 13 placas
  expect((await balanceOf("PLACA_MDF_NEGRO")).taller).toBe(17);
});

test("cajas sin placa negra no descuentan placas", async () => {
  const { order, papa, dal } = await makeOrder({ quantity: 10, status: "LISTO" });
  await stock(papa, dal);
  await registerDelivery(papa, { ...base, orderId: order.id, requestId: "r1" });
  expect((await balanceOf("PLACA_MDF_NEGRO")).taller).toBe(30);
});

test("anular la entrega devuelve las placas", async () => {
  const { order, papa, dal } = await makeOrder({ quantity: 24, status: "LISTO", boxesPerBlackPlate: 12 });
  await stock(papa, dal);
  const { delivery } = await registerDelivery(papa, { ...base, orderId: order.id, requestId: "r1" });
  expect((await balanceOf("PLACA_MDF_NEGRO")).taller).toBe(28);
  const admin = await makeUser("ADMIN");
  await annulDelivery(admin, delivery.id, "error de carga");
  expect((await balanceOf("PLACA_MDF_NEGRO")).taller).toBe(30);
});

test("catálogo: se carga y se cambia cuántas cajas salen por placa negra", async () => {
  const admin = await makeUser("ADMIN");
  const bt = await createBoxType(admin, { name: "Premium", unitPrice: 1000, recipe: {}, boxesPerBlackPlate: 12 });
  expect((await getBoxTypeDetail(bt.id))?.boxesPerBlackPlate).toBe(12);
  await updateBoxType(admin, bt.id, { boxesPerBlackPlate: null });
  expect((await getBoxTypeDetail(bt.id))?.boxesPerBlackPlate).toBeNull();
  await expect(updateBoxType(admin, bt.id, { boxesPerBlackPlate: 0 })).rejects.toMatchObject({ code: "INVALID_QUANTITY" });
});

test("placas rotas: se descuentan del taller con el motivo", async () => {
  const papa = await makeUser("TALLER");
  const dal = await makeUser("DALMATA");
  await registerPlateArrival(dal, { materialCode: "PLACA_GRUESA", quantity: 10 });
  await registerPlatePickup(papa, { materialCode: "PLACA_GRUESA", quantity: 10 });
  await registerPlateBreakage(papa, { materialCode: "PLACA_GRUESA", quantity: 2, reason: "HUMEDAD" });
  await registerPlateBreakage(papa, { materialCode: "PLACA_GRUESA", quantity: 1, reason: "OTRO", note: "se cayó" });
  expect((await balanceOf("PLACA_GRUESA")).taller).toBe(7);
  const notes = (await prisma.stockMovement.findMany({ where: { type: "DESCARTE" }, orderBy: { createdAt: "asc" } })).map(
    (m) => m.note,
  );
  expect(notes).toEqual(["Rota: humedad", "Rota: se cayó"]);
});

test("placas rotas: «otro» pide detalle, herrajes no se aceptan y Dalmata no puede", async () => {
  const papa = await makeUser("TALLER");
  const dal = await makeUser("DALMATA");
  await expect(
    registerPlateBreakage(papa, { materialCode: "PLACA_GRUESA", quantity: 1, reason: "OTRO" }),
  ).rejects.toMatchObject({ code: "REASON_REQUIRED" });
  await expect(
    registerPlateBreakage(papa, { materialCode: "TORNILLO", quantity: 1, reason: "DOBLADA" }),
  ).rejects.toMatchObject({ code: "NOT_PLATE" });
  await expect(
    registerPlateBreakage(dal, { materialCode: "PLACA_GRUESA", quantity: 1, reason: "DOBLADA" }),
  ).rejects.toThrow();
});
