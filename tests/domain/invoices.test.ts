import { prisma } from "@/lib/db";
import { registerDelivery } from "@/domain/deliveries";
import { setPrice } from "@/domain/catalog";
import {
  annulInvoice,
  createInvoiceFromDelivery,
  getAccountBalance,
  getInvoice,
  listInvoices,
  markInvoicePaid,
  markInvoiceSent,
  updateInvoiceLine,
} from "@/domain/invoices";
import { ForbiddenError } from "@/lib/errors";
import { resetDb } from "../helpers/db";
import { makeUser } from "../helpers/factories";
import { makeOrder } from "../helpers/orders";

beforeEach(resetDb);

let rid = 0;
async function delivered(opts: { quantity?: number; price?: number; at?: Date } = {}) {
  const o = await makeOrder({ quantity: opts.quantity ?? 10, status: "LISTO", price: opts.price });
  const { delivery } = await registerDelivery(o.papa, {
    orderId: o.order.id,
    requestId: `r${++rid}`,
    deliveredAt: opts.at ?? new Date("2026-05-20T12:00:00-03:00"),
    pickupType: "FLETERO",
    pickupName: "Juan",
  });
  return { ...o, delivery };
}

const firstLine = async (invoiceId: string) =>
  (await prisma.invoiceLine.findFirstOrThrow({ where: { invoiceId } })).id;

test("comprobante con precio del día de la entrega y recargo por unidad", async () => {
  const { papa, bt, delivery } = await delivered();
  await setPrice(papa, bt.id, 1500, new Date("2026-06-01T00:00:00-03:00"));
  const inv = await createInvoiceFromDelivery(papa, delivery.id);
  expect(inv.total.toNumber()).toBe(10000);
  const lineId = await firstLine(inv.id);
  await updateInvoiceLine(papa, lineId, { surchargeMode: "PER_UNIT", surchargeValue: 200, surchargeReason: "logo detallado" });
  expect((await getInvoice(papa, inv.id)).total.toNumber()).toBe(12000);
  await updateInvoiceLine(papa, lineId, { surchargeMode: "TOTAL", surchargeValue: 500, surchargeReason: "x" });
  expect((await getInvoice(papa, inv.id)).total.toNumber()).toBe(10500);
  await updateInvoiceLine(papa, lineId, { unitPrice: 900, surchargeMode: null });
  expect((await getInvoice(papa, inv.id)).total.toNumber()).toBe(9000);
});

test("cambiar la lista de precios no altera un comprobante emitido", async () => {
  const { papa, bt, delivery } = await delivered();
  const inv = await createInvoiceFromDelivery(papa, delivery.id);
  await setPrice(papa, bt.id, 5000, new Date("2026-01-02T00:00:00-03:00"));
  const again = await getInvoice(papa, inv.id);
  expect(again.total.toNumber()).toBe(10000);
  expect(again.lines[0].unitPrice.toNumber()).toBe(1000);
});

test("segundo comprobante para la misma entrega -> INVOICE_EXISTS; tras anular el primero se permite", async () => {
  const { papa, delivery } = await delivered();
  const admin = await makeUser("ADMIN");
  const inv = await createInvoiceFromDelivery(papa, delivery.id);
  await expect(createInvoiceFromDelivery(papa, delivery.id)).rejects.toMatchObject({ code: "INVOICE_EXISTS" });
  await annulInvoice(admin, inv.id, "error de precio");
  const inv2 = await createInvoiceFromDelivery(papa, delivery.id);
  expect(inv2.number).toBeGreaterThan(inv.number);
  await expect(annulInvoice(admin, inv.id, "otra vez")).rejects.toMatchObject({ code: "ALREADY_ANNULLED" });
});

test("anular exige motivo y no lo puede hacer el taller", async () => {
  const { papa, delivery } = await delivered();
  const admin = await makeUser("ADMIN");
  const inv = await createInvoiceFromDelivery(papa, delivery.id);
  await expect(annulInvoice(papa, inv.id, "x")).rejects.toBeInstanceOf(ForbiddenError);
  await expect(annulInvoice(admin, inv.id, "  ")).rejects.toMatchObject({ code: "REASON_REQUIRED" });
});

test("recargo sin motivo -> SURCHARGE_REASON_REQUIRED", async () => {
  const { papa, delivery } = await delivered();
  const inv = await createInvoiceFromDelivery(papa, delivery.id);
  await expect(
    updateInvoiceLine(papa, await firstLine(inv.id), { surchargeMode: "PER_UNIT", surchargeValue: 100 }),
  ).rejects.toMatchObject({ code: "SURCHARGE_REASON_REQUIRED" });
});

test("precio o recargo negativo -> INVALID_INPUT", async () => {
  const { papa, delivery } = await delivered();
  const inv = await createInvoiceFromDelivery(papa, delivery.id);
  const lineId = await firstLine(inv.id);
  await expect(updateInvoiceLine(papa, lineId, { unitPrice: -1 })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    updateInvoiceLine(papa, lineId, { surchargeMode: "TOTAL", surchargeValue: -5, surchargeReason: "x" }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});

test("no se puede editar una línea de un comprobante ENVIADO -> INVOICE_LOCKED", async () => {
  const { papa, delivery } = await delivered();
  const inv = await createInvoiceFromDelivery(papa, delivery.id);
  await markInvoiceSent(papa, inv.id);
  await expect(updateInvoiceLine(papa, await firstLine(inv.id), { unitPrice: 2000 })).rejects.toMatchObject({
    code: "INVOICE_LOCKED",
  });
});

test("EMITIDO -> PAGADO directo -> INVALID_TRANSITION; ENVIADO -> PAGADO guarda fecha y nota", async () => {
  const { papa, delivery } = await delivered();
  const inv = await createInvoiceFromDelivery(papa, delivery.id);
  const paidAt = new Date("2026-06-10T10:00:00-03:00");
  await expect(markInvoicePaid(papa, inv.id, { paidAt })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  await markInvoiceSent(papa, inv.id);
  await expect(markInvoiceSent(papa, inv.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  await markInvoicePaid(papa, inv.id, { paidAt, paymentNote: "transferencia" });
  const got = await getInvoice(papa, inv.id);
  expect(got.status).toBe("PAGADO");
  expect(got.paidAt?.getTime()).toBe(paidAt.getTime());
  expect(got.paymentNote).toBe("transferencia");
  expect(got.sentAt).not.toBeNull();
});

test("no se puede facturar una entrega anulada", async () => {
  const { delivery, papa } = await delivered();
  await prisma.delivery.update({ where: { id: delivery.id }, data: { annulledAt: new Date(), annulReason: "x" } });
  await expect(createInvoiceFromDelivery(papa, delivery.id)).rejects.toMatchObject({ code: "DELIVERY_ANNULLED" });
});

test("DALMATA puede ver pero no crear ni marcar pagado", async () => {
  const { papa, dal, delivery } = await delivered();
  await expect(createInvoiceFromDelivery(dal, delivery.id)).rejects.toBeInstanceOf(ForbiddenError);
  const inv = await createInvoiceFromDelivery(papa, delivery.id);
  await markInvoiceSent(papa, inv.id);
  await expect(markInvoicePaid(dal, inv.id, { paidAt: new Date() })).rejects.toBeInstanceOf(ForbiddenError);
  await expect(updateInvoiceLine(dal, await firstLine(inv.id), { unitPrice: 1 })).rejects.toBeInstanceOf(ForbiddenError);
  expect((await getInvoice(dal, inv.id)).id).toBe(inv.id);
  expect((await listInvoices(dal, {})).length).toBe(1);
  expect((await getAccountBalance(dal)).owed.toNumber()).toBe(10000);
});

test("listInvoices filtra por estado y fechas", async () => {
  const { papa, delivery } = await delivered();
  const b = await delivered();
  const i1 = await createInvoiceFromDelivery(papa, delivery.id);
  await createInvoiceFromDelivery(b.papa, b.delivery.id);
  await markInvoiceSent(papa, i1.id);
  expect((await listInvoices(papa, { status: "ENVIADO" })).map((i) => i.id)).toEqual([i1.id]);
  const tomorrow = new Date(Date.now() + 86400000);
  expect(await listInvoices(papa, { from: tomorrow })).toEqual([]);
  expect((await listInvoices(papa, { to: tomorrow })).length).toBe(2);
});

test("saldo: emitido 22000, pagado 10000, adeudado 12000; anulados no suman", async () => {
  const admin = await makeUser("ADMIN");
  const a = await delivered({ quantity: 10 });
  const b = await delivered({ quantity: 12 });
  const c = await delivered({ quantity: 5 });
  const ia = await createInvoiceFromDelivery(a.papa, a.delivery.id);
  const ib = await createInvoiceFromDelivery(b.papa, b.delivery.id);
  const ic = await createInvoiceFromDelivery(c.papa, c.delivery.id);
  await markInvoiceSent(a.papa, ia.id);
  await markInvoicePaid(a.papa, ia.id, { paidAt: new Date() });
  await annulInvoice(admin, ic.id, "duplicado");
  const bal = await getAccountBalance(a.papa);
  expect(bal.issued.toNumber()).toBe(22000);
  expect(bal.paid.toNumber()).toBe(10000);
  expect(bal.owed.toNumber()).toBe(12000);
  expect(bal.unpaid.map((u) => u.id)).toEqual([ib.id]);
  expect(bal.unpaid[0].daysOld).toBe(0);
});
