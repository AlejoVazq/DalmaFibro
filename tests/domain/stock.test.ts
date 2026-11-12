import { prisma } from "@/lib/db";
import {
  registerIngreso,
  registerDiscard,
  registerAdjustment,
  registerPlateArrival,
  registerPlatePickup,
  registerPlateUse,
  listMovements,
} from "@/domain/stock";
import { ForbiddenError } from "@/lib/errors";
import { resetDb } from "../helpers/db";
import { makeUser } from "../helpers/factories";
import { balanceOf } from "../helpers/stock";

beforeEach(resetDb);

test("ingreso y descarte por lote", async () => {
  const papa = await makeUser("TALLER");
  await registerIngreso(papa, { materialCode: "BISAGRA", quantity: 500 });
  await registerDiscard(papa, {
    items: [
      { materialCode: "BISAGRA", quantity: 14 },
      { materialCode: "TORNILLO", quantity: 30 },
    ],
  });
  expect((await balanceOf("BISAGRA")).taller).toBe(486);
  expect((await balanceOf("TORNILLO")).taller).toBe(-30);
  expect(await prisma.discard.count()).toBe(1);
  expect(await prisma.stockMovement.count({ where: { type: "DESCARTE" } })).toBe(2);
});

test("descarte ignora filas en 0 y rechaza lote vacío", async () => {
  const papa = await makeUser("TALLER");
  await expect(
    registerDiscard(papa, { items: [{ materialCode: "BISAGRA", quantity: 0 }] }),
  ).rejects.toMatchObject({ code: "EMPTY_DISCARD" });
});

test("retiro de placas mueve de Dalmata al taller", async () => {
  const dal = await makeUser("DALMATA");
  const papa = await makeUser("TALLER");
  await registerPlateArrival(dal, { materialCode: "PLACA_GRUESA", quantity: 40 });
  await registerPlatePickup(papa, { materialCode: "PLACA_GRUESA", quantity: 20 });
  await registerPlateUse(papa, { materialCode: "PLACA_GRUESA", quantity: 5 });
  const b = await balanceOf("PLACA_GRUESA");
  expect(b.dalmata).toBe(20);
  expect(b.taller).toBe(15);
  const pair = await prisma.stockMovement.findMany({ where: { type: "RETIRO_PLACA" } });
  expect(pair).toHaveLength(2);
  expect(pair[0].transferGroupId).toBe(pair[1].transferGroupId);
});

test("DALMATA no puede ingresar herrajes, descartar ni retirar placas", async () => {
  const dal = await makeUser("DALMATA");
  await expect(registerIngreso(dal, { materialCode: "BISAGRA", quantity: 1 })).rejects.toBeInstanceOf(ForbiddenError);
  await expect(
    registerDiscard(dal, { items: [{ materialCode: "BISAGRA", quantity: 1 }] }),
  ).rejects.toBeInstanceOf(ForbiddenError);
  await expect(
    registerPlatePickup(dal, { materialCode: "PLACA_GRUESA", quantity: 1 }),
  ).rejects.toBeInstanceOf(ForbiddenError);
});

test("ajuste sin motivo -> REASON_REQUIRED; con motivo suma delta", async () => {
  const papa = await makeUser("TALLER");
  await expect(
    registerAdjustment(papa, { materialCode: "TORNILLO", location: "TALLER", delta: 5, reason: " " }),
  ).rejects.toMatchObject({ code: "REASON_REQUIRED" });
  await registerAdjustment(papa, { materialCode: "TORNILLO", location: "TALLER", delta: -7, reason: "conteo" });
  expect((await balanceOf("TORNILLO")).taller).toBe(-7);
});

test("tipos de material equivocados", async () => {
  const papa = await makeUser("TALLER");
  await expect(
    registerDiscard(papa, { items: [{ materialCode: "PLACA_GRUESA", quantity: 1 }] }),
  ).rejects.toMatchObject({ code: "NOT_HARDWARE" });
  await expect(registerIngreso(papa, { materialCode: "PLACA_GRUESA", quantity: 1 })).rejects.toMatchObject({
    code: "NOT_HARDWARE",
  });
  await expect(registerPlatePickup(papa, { materialCode: "BISAGRA", quantity: 1 })).rejects.toMatchObject({
    code: "NOT_PLATE",
  });
});

test("cantidades inválidas", async () => {
  const papa = await makeUser("TALLER");
  for (const q of [0, -3, 1.5, NaN]) {
    await expect(registerIngreso(papa, { materialCode: "BISAGRA", quantity: q })).rejects.toMatchObject({
      code: "INVALID_QUANTITY",
    });
  }
});

test("DALMATA puede ver movimientos", async () => {
  const dal = await makeUser("DALMATA");
  await registerPlateArrival(dal, { materialCode: "PLACA_MDF_NEGRO", quantity: 3 });
  const res = await listMovements(dal, {});
  expect(res.items).toHaveLength(1);
  expect(res.total).toBe(1);
});
