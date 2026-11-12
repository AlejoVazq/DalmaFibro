import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { registerDelivery } from "@/domain/deliveries";
import { createInvoiceFromDelivery, updateInvoiceLine } from "@/domain/invoices";
import { buildAccountingWorkbook } from "@/domain/export";
import { registerIngreso } from "@/domain/stock";
import { ForbiddenError } from "@/lib/errors";
import { resetDb } from "../helpers/db";
import { makeOrder } from "../helpers/orders";

beforeEach(resetDb);

async function invoiced(quantity: number, requestId: string) {
  const o = await makeOrder({ quantity, status: "LISTO" });
  const { delivery } = await registerDelivery(o.papa, {
    orderId: o.order.id,
    requestId,
    deliveredAt: new Date(),
    pickupType: "FLETERO",
    pickupName: "Juan",
  });
  const inv = await createInvoiceFromDelivery(o.papa, delivery.id);
  return { ...o, inv };
}

async function read(buf: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb;
}

const today = () => new Date();

test("libro con 3 hojas, montos numéricos y fechas reales", async () => {
  const { papa, inv } = await invoiced(10, "a");
  const line = await prisma.invoiceLine.findFirstOrThrow({ where: { invoiceId: inv.id } });
  await updateInvoiceLine(papa, line.id, { surchargeMode: "PER_UNIT", surchargeValue: 200, surchargeReason: "grabado" });
  await registerIngreso(papa, { materialCode: "TORNILLO", quantity: 500, note: "compra" });

  const wb = await read(await buildAccountingWorkbook(papa, { from: today(), to: today() }));
  expect(wb.worksheets.map((w) => w.name)).toEqual(["Comprobantes", "Detalle", "Movimientos de stock"]);

  const c = wb.getWorksheet("Comprobantes")!;
  const header = (c.getRow(1).values as unknown[]).slice(1);
  expect(header).toEqual(["Número", "Fecha", "Pedido", "Estado", "Fecha envío", "Fecha pago", "Medio de pago", "Total"]);
  expect(c.getRow(2).getCell(8).value).toBe(12000);
  expect(c.getRow(2).getCell(2).value).toBeInstanceOf(Date);
  expect(c.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });

  const d = wb.getWorksheet("Detalle")!;
  expect((d.getRow(1).values as unknown[]).slice(1)).toEqual([
    "Comprobante", "Fecha", "Tipo de caja", "Cantidad", "Precio unitario", "Recargo", "Subtotal",
  ]);
  expect(d.getRow(2).getCell(4).value).toBe(10);
  expect(d.getRow(2).getCell(6).value).toBe(2000);
  expect(d.getRow(2).getCell(7).value).toBe(12000);

  const m = wb.getWorksheet("Movimientos de stock")!;
  expect((m.getRow(1).values as unknown[]).slice(1)).toEqual([
    "Fecha", "Material", "Ubicación", "Tipo", "Cantidad", "Pedido", "Entrega", "Usuario", "Nota",
  ]);
  // 3 consumos de la entrega + 1 ingreso
  expect(m.rowCount).toBe(5);
});

test("un comprobante fuera del rango no aparece", async () => {
  const { papa, inv } = await invoiced(10, "a");
  await prisma.invoice.update({ where: { id: inv.id }, data: { issuedAt: new Date("2026-01-15T12:00:00-03:00") } });
  await invoiced(5, "b");
  const wb = await read(await buildAccountingWorkbook(papa, { from: today(), to: today() }));
  const c = wb.getWorksheet("Comprobantes")!;
  expect(c.rowCount).toBe(2);
  expect(c.getRow(2).getCell(8).value).toBe(5000);
});

test("DALMATA no puede exportar", async () => {
  const { dal } = await invoiced(1, "a");
  await expect(buildAccountingWorkbook(dal, { from: today(), to: today() })).rejects.toBeInstanceOf(ForbiddenError);
});
