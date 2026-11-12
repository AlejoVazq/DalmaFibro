import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { assertCan, type SessionUser } from "@/lib/auth/permissions";
import { dayEnd, dayStart, isoDay } from "@/lib/format";
import { INVOICE_STATUS_LABEL, LOCATION_LABEL, MOVEMENT_LABEL } from "@/lib/labels";
import { mul, toDecimal } from "@/lib/money";

const MONEY = "#,##0.00";
const DATE = "dd/mm/yyyy";
const DATETIME = "dd/mm/yyyy hh:mm";
const AR_OFFSET_MS = 3 * 3_600_000;

/** Excel no tiene zona horaria: se escribe la hora argentina como "hora de pared". */
function xlDate(d: Date | null | undefined): Date | null {
  return d ? new Date(d.getTime() - AR_OFFSET_MS) : null;
}

function sheet(wb: ExcelJS.Workbook, name: string, cols: { header: string; width: number; numFmt?: string }[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = cols.map((c) => ({ header: c.header, width: c.width, style: c.numFmt ? { numFmt: c.numFmt } : {} }));
  ws.getRow(1).font = { bold: true };
  return ws;
}

/** Libro contable: comprobantes, detalle de líneas y movimientos de stock en el rango [from, to] (días completos, hora argentina). */
export async function buildAccountingWorkbook(actor: SessionUser, range: { from: Date; to: Date }): Promise<Buffer> {
  assertCan(actor, "export.excel");
  const gte = dayStart(isoDay(range.from))!;
  const lte = dayEnd(isoDay(range.to))!;

  const [invoices, movements] = await Promise.all([
    prisma.invoice.findMany({
      where: { issuedAt: { gte, lte } },
      include: { lines: { orderBy: { id: "asc" } }, delivery: { include: { order: { select: { number: true } } } } },
      orderBy: { number: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { createdAt: { gte, lte } },
      include: {
        material: { select: { name: true } },
        order: { select: { number: true } },
        delivery: { select: { deliveredAt: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Gestión Dalmata";

  const inv = sheet(wb, "Comprobantes", [
    { header: "Número", width: 10 },
    { header: "Fecha", width: 12, numFmt: DATE },
    { header: "Pedido", width: 10 },
    { header: "Estado", width: 18 },
    { header: "Fecha envío", width: 12, numFmt: DATE },
    { header: "Fecha pago", width: 12, numFmt: DATE },
    { header: "Medio de pago", width: 24 },
    { header: "Total", width: 14, numFmt: MONEY },
  ]);
  for (const i of invoices) {
    inv.addRow([
      i.number,
      xlDate(i.issuedAt),
      i.delivery.order.number,
      INVOICE_STATUS_LABEL[i.status],
      xlDate(i.sentAt),
      xlDate(i.paidAt),
      i.paymentNote ?? "",
      i.total.toNumber(),
    ]);
  }

  const det = sheet(wb, "Detalle", [
    { header: "Comprobante", width: 12 },
    { header: "Fecha", width: 12, numFmt: DATE },
    { header: "Tipo de caja", width: 28 },
    { header: "Cantidad", width: 10 },
    { header: "Precio unitario", width: 14, numFmt: MONEY },
    { header: "Recargo", width: 14, numFmt: MONEY },
    { header: "Subtotal", width: 14, numFmt: MONEY },
  ]);
  for (const i of invoices) {
    for (const l of i.lines) {
      const surcharge =
        l.surchargeMode === "PER_UNIT"
          ? mul(l.surchargeValue, l.quantity)
          : l.surchargeMode === "TOTAL"
            ? l.surchargeValue
            : toDecimal(0);
      det.addRow([
        i.number,
        xlDate(i.issuedAt),
        l.boxTypeName,
        l.quantity,
        l.unitPrice.toNumber(),
        surcharge.toNumber(),
        l.subtotal.toNumber(),
      ]);
    }
  }

  const mov = sheet(wb, "Movimientos de stock", [
    { header: "Fecha", width: 16, numFmt: DATETIME },
    { header: "Material", width: 22 },
    { header: "Ubicación", width: 20 },
    { header: "Tipo", width: 20 },
    { header: "Cantidad", width: 10 },
    { header: "Pedido", width: 10 },
    { header: "Entrega", width: 16, numFmt: DATETIME },
    { header: "Usuario", width: 18 },
    { header: "Nota", width: 40 },
  ]);
  for (const m of movements) {
    mov.addRow([
      xlDate(m.createdAt),
      m.material.name,
      LOCATION_LABEL[m.location],
      MOVEMENT_LABEL[m.type],
      m.quantity,
      m.order?.number ?? null,
      xlDate(m.delivery?.deliveredAt),
      m.createdBy.name,
      m.note ?? "",
    ]);
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
