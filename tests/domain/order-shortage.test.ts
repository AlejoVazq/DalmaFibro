import { createOrder, getOrder, updateOrder } from "@/domain/orders";
import { registerIngreso } from "@/domain/stock";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";
import { makeBoxType, makeUser } from "../helpers/factories";

beforeEach(resetDb);

async function setup() {
  const dal = await makeUser("DALMATA");
  const papa = await makeUser("TALLER");
  const bt = await makeBoxType({ recipe: { TORNILLO: 12, BISAGRA: 2 } });
  await registerIngreso(papa, { materialCode: "TORNILLO", quantity: 30 });
  await registerIngreso(papa, { materialCode: "BISAGRA", quantity: 100 });
  return { dal, papa, bt };
}

test("si faltan herrajes no deja crear el pedido y dice cuánto falta", async () => {
  const { dal, bt } = await setup();
  // 10 cajas × 12 = 120 tornillos, hay 30 → faltan 90
  await expect(
    createOrder(dal, { priority: "MEDIA", lines: [{ boxTypeId: bt.id, quantity: 10, withLogo: true }] }),
  ).rejects.toMatchObject({ code: "MATERIALS_SHORT", shortage: [{ code: "TORNILLO", name: "Tornillos", missing: 90 }] });
  expect(await prisma.order.count()).toBe(0);
});

test("con stock suficiente se crea normal y sin marca", async () => {
  const { dal, bt } = await setup();
  const o = await createOrder(dal, { priority: "MEDIA", lines: [{ boxTypeId: bt.id, quantity: 2, withLogo: true }] });
  const full = await getOrder(dal, o.id);
  expect(full?.materialsOrderedAt).toBeNull();
});

test("cuenta lo reservado por otros pedidos abiertos", async () => {
  const { dal, bt } = await setup();
  await createOrder(dal, { priority: "MEDIA", lines: [{ boxTypeId: bt.id, quantity: 2, withLogo: true }] }); // reserva 24
  await expect(
    createOrder(dal, { priority: "MEDIA", lines: [{ boxTypeId: bt.id, quantity: 1, withLogo: true }] }), // 6 libres, pide 12
  ).rejects.toMatchObject({ shortage: [{ code: "TORNILLO", missing: 6 }] });
});

test("marcando materiales encargados se crea y queda registrado en el pedido", async () => {
  const { dal, bt } = await setup();
  const o = await createOrder(dal, {
    priority: "MEDIA",
    materialsOrdered: true,
    lines: [{ boxTypeId: bt.id, quantity: 10, withLogo: true }],
  });
  const full = await getOrder(dal, o.id);
  expect(full?.materialsOrderedAt).toBeInstanceOf(Date);
  expect(full?.materialsOrderedByName).toBe(dal.name);
  expect(full?.materialsShortage).toEqual([{ code: "TORNILLO", name: "Tornillos", missing: 90 }]);
});

test("al editar subiendo cantidades también frena, sin contar lo que ya reservaba el mismo pedido", async () => {
  const { dal, bt } = await setup();
  const o = await createOrder(dal, { priority: "MEDIA", lines: [{ boxTypeId: bt.id, quantity: 2, withLogo: true }] });
  // editar a 2 cajas de nuevo no debe frenar (no se cuenta dos veces)
  await updateOrder(dal, o.id, { priority: "ALTA", lines: [{ boxTypeId: bt.id, quantity: 2, withLogo: true }] });
  await expect(
    updateOrder(dal, o.id, { priority: "ALTA", lines: [{ boxTypeId: bt.id, quantity: 5, withLogo: true }] }),
  ).rejects.toMatchObject({ code: "MATERIALS_SHORT", shortage: [{ code: "TORNILLO", missing: 30 }] });
  const unchanged = await getOrder(dal, o.id);
  expect(unchanged?.lines[0].quantity).toBe(2);

  await updateOrder(dal, o.id, {
    priority: "ALTA",
    materialsOrdered: true,
    lines: [{ boxTypeId: bt.id, quantity: 5, withLogo: true }],
  });
  const marked = await getOrder(dal, o.id);
  expect(marked?.materialsShortage).toEqual([{ code: "TORNILLO", name: "Tornillos", missing: 30 }]);
});

test("vista previa: avisa el faltante mientras se arma el pedido, ignorando cantidades vacías", async () => {
  const { dal, bt } = await setup();
  const { previewShortage } = await import("@/domain/shortage");
  expect(await previewShortage(dal, [{ boxTypeId: bt.id, quantity: 10 }])).toEqual([
    { code: "TORNILLO", name: "Tornillos", missing: 90 },
  ]);
  expect(await previewShortage(dal, [{ boxTypeId: bt.id, quantity: NaN }])).toEqual([]);
  // al editar no cuenta lo que ya reserva el mismo pedido
  const o = await createOrder(dal, { priority: "MEDIA", lines: [{ boxTypeId: bt.id, quantity: 2, withLogo: true }] });
  expect(await previewShortage(dal, [{ boxTypeId: bt.id, quantity: 2 }], o.id)).toEqual([]);
  expect(await previewShortage(dal, [{ boxTypeId: bt.id, quantity: 3 }], o.id)).toEqual([
    { code: "TORNILLO", name: "Tornillos", missing: 6 },
  ]);
});
