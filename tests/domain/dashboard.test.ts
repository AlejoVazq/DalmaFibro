import { getDashboard } from "@/domain/dashboard";
import { registerIngreso } from "@/domain/stock";
import { resetDb } from "../helpers/db";
import { makeOrder } from "../helpers/orders";

beforeEach(resetDb);

test("listos para retirar, pedidos abiertos y alertas de stock", async () => {
  const ready = await makeOrder({ quantity: 10, status: "LISTO" });
  await makeOrder({ quantity: 5, status: "EN_PRODUCCION", priority: "ALTA" });
  await registerIngreso(ready.papa, { materialCode: "BISAGRA", quantity: 1000 });
  await registerIngreso(ready.papa, { materialCode: "CIERRE_A", quantity: 1000 });

  const d = await getDashboard(ready.dal);
  expect(d.readyForPickup.map((o) => o.id)).toEqual([ready.order.id]);
  expect(d.readyForPickup[0].boxes).toBe(10);
  expect(d.openOrders).toHaveLength(2);
  expect(d.openOrders[0].priority).toBe("ALTA");
  // 15 cajas × 12 tornillos comprometidos sin stock
  expect(d.stockAlerts).toContainEqual({ code: "TORNILLO", name: expect.stringMatching(/tornillo/i), available: -180, level: "falta" });
  // Cierre B sin stock y bisagras con 1000 libres o menos: avisos por umbral
  expect(d.stockAlerts.find((a) => a.code === "CIERRE_B")?.level).toMatch(/critico|falta/);
  expect(d.stockAlerts.find((a) => a.code === "BISAGRA")?.level).toMatch(/critico|falta/);
  // ordenados de más grave a menos grave
  expect(d.stockAlerts[0].level).toBe("falta");
  expect(d.owed?.toNumber()).toBe(0);
  expect(d.unpaidCount).toBe(0);
});
