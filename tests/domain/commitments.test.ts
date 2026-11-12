import { getCommitments, getStockOverview } from "@/domain/commitments";
import { cancelOrder } from "@/domain/orders";
import { registerIngreso } from "@/domain/stock";
import { resetDb } from "../helpers/db";
import { material } from "../helpers/factories";
import { makeOrder } from "../helpers/orders";

beforeEach(resetDb);

test("comprometido = pendiente × receta; disponible = actual − comprometido", async () => {
  const { papa } = await makeOrder({ quantity: 10 });
  const c = await getCommitments();
  expect(c.get((await material("TORNILLO")).id)).toBe(120);
  expect(c.get((await material("BISAGRA")).id)).toBe(20);
  expect(c.get((await material("CIERRE_A")).id)).toBe(10);
  await registerIngreso(papa, { materialCode: "TORNILLO", quantity: 100 });
  const tornillo = (await getStockOverview()).hardware.find((h) => h.code === "TORNILLO")!;
  expect(tornillo.taller).toBe(100);
  expect(tornillo.committed).toBe(120);
  expect(tornillo.available).toBe(-20);
});

test("pedido cancelado no compromete stock", async () => {
  const { order, dal } = await makeOrder({ quantity: 10 });
  await cancelOrder(dal, order.id);
  const c = await getCommitments();
  expect(c.get((await material("TORNILLO")).id) ?? 0).toBe(0);
});
