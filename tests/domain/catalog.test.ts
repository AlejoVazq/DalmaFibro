import { prisma } from "@/lib/db";
import {
  createBoxType,
  updateBoxType,
  setPrice,
  getPriceAt,
  getRecipe,
  listBoxTypes,
  renameMaterial,
} from "@/domain/catalog";
import { ForbiddenError } from "@/lib/errors";
import { resetDb } from "../helpers/db";
import { makeBoxType, makeUser, material } from "../helpers/factories";

beforeEach(resetDb);

test("precio vigente según fecha", async () => {
  const admin = await makeUser("ADMIN");
  const bt = await makeBoxType({ price: 1000 });
  await setPrice(admin, bt.id, 1500, new Date("2026-06-01T00:00:00-03:00"));
  expect((await getPriceAt(bt.id, new Date("2026-05-31T12:00:00-03:00"))).toNumber()).toBe(1000);
  expect((await getPriceAt(bt.id, new Date("2026-06-01T00:00:00-03:00"))).toNumber()).toBe(1500);
});

test("receta por defecto: 12 tornillos, 2 bisagras, 1 cierre A", async () => {
  const admin = await makeUser("ADMIN");
  const bt = await createBoxType(admin, { name: "Premium", unitPrice: 2000, recipe: {} });
  const recipe = await getRecipe(bt.id);
  const byId = Object.fromEntries(recipe.map((r) => [r.materialId, r.qtyPerBox]));
  expect(byId[(await material("TORNILLO")).id]).toBe(12);
  expect(byId[(await material("BISAGRA")).id]).toBe(2);
  expect(byId[(await material("CIERRE_A")).id]).toBe(1);
  expect(recipe).toHaveLength(3);
  expect((await listBoxTypes({})).find((b) => b.id === bt.id)?.currentPrice?.toNumber()).toBe(2000);
});

test("TALLER puede editar precios y receta; DALMATA no", async () => {
  const papa = await makeUser("TALLER");
  const dal = await makeUser("DALMATA");
  const bt = await makeBoxType();
  await setPrice(papa, bt.id, 1200);
  await updateBoxType(papa, bt.id, { recipe: { TORNILLO: 16, BISAGRA: 2, CIERRE_B: 1 } });
  const recipe = await getRecipe(bt.id);
  expect(recipe.find((r) => r.materialId === undefined)).toBeUndefined();
  expect(recipe).toHaveLength(3);
  await expect(setPrice(dal, bt.id, 1)).rejects.toBeInstanceOf(ForbiddenError);
  await expect(updateBoxType(dal, bt.id, { active: false })).rejects.toBeInstanceOf(ForbiddenError);
});

test("la receta no admite placas", async () => {
  const admin = await makeUser("ADMIN");
  const bt = await makeBoxType();
  await expect(updateBoxType(admin, bt.id, { recipe: { PLACA_GRUESA: 1 } })).rejects.toMatchObject({
    code: "NOT_HARDWARE",
  });
});

test("NO_PRICE antes del primer precio", async () => {
  const bt = await makeBoxType();
  await expect(getPriceAt(bt.id, new Date("2025-12-31T00:00:00-03:00"))).rejects.toMatchObject({
    code: "NO_PRICE",
  });
});

test("renombrar cierre", async () => {
  const papa = await makeUser("TALLER");
  await renameMaterial(papa, "CIERRE_B", "Cierre dorado");
  expect((await prisma.material.findUniqueOrThrow({ where: { code: "CIERRE_B" } })).name).toBe("Cierre dorado");
});
