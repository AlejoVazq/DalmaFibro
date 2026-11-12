import { saveMockup, readMockup } from "@/domain/mockups";
import { setOrderStatus } from "@/domain/orders";
import { resetDb } from "../helpers/db";
import { makeOrder } from "../helpers/orders";

beforeEach(resetDb);

const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });

test("guarda y lee un mockup válido", async () => {
  const { order, dal } = await makeOrder();
  const m = await saveMockup(dal, { orderId: order.id, file: file("logo.png", "image/png", 1024) });
  const r = await readMockup(dal, m.id);
  expect(r.mimeType).toBe("image/png");
  expect(r.filename).toBe("logo.png");
  expect(r.data.byteLength).toBe(1024);
});

test("mockup .exe o de 21 MB -> INVALID_FILE", async () => {
  const { order, dal } = await makeOrder();
  await expect(
    saveMockup(dal, { orderId: order.id, file: file("x.exe", "application/x-msdownload", 10) }),
  ).rejects.toMatchObject({ code: "INVALID_FILE" });
  await expect(
    saveMockup(dal, { orderId: order.id, file: file("big.pdf", "application/pdf", 21 * 1024 * 1024) }),
  ).rejects.toMatchObject({ code: "INVALID_FILE" });
});

test("Dalmata no puede subir mockups a un pedido en producción", async () => {
  const { order, dal, papa } = await makeOrder();
  await setOrderStatus(papa, order.id, "EN_PRODUCCION");
  await expect(
    saveMockup(dal, { orderId: order.id, file: file("logo.png", "image/png", 10) }),
  ).rejects.toMatchObject({ code: "ORDER_LOCKED" });
});
