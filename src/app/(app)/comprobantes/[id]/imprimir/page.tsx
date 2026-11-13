import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { getInvoice } from "@/domain/invoices";
import { INVOICE_STATUS_LABEL } from "@/lib/labels";
import { InvoiceBody } from "../../invoice-body";
import { PrintButton } from "./print-button";

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  const inv = await getInvoice(actor, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-xl bg-white p-4 text-black sm:p-8 print:max-w-none print:rounded-none print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/comprobantes/${inv.id}`} className="inline-flex h-9 items-center text-sm text-muted-foreground hover:text-foreground">
          ← Volver al comprobante
        </Link>
        <PrintButton />
      </div>
      <header className="flex items-start justify-between border-b pb-3">
        <div>
          <div className="text-lg font-semibold">Comprobante interno #{inv.number}</div>
          <div className="text-sm">Taller → Dalmata · Mano de obra de cajas</div>
        </div>
        <div className="text-sm text-right">
          Estado: {INVOICE_STATUS_LABEL[inv.status]}
          <div className="text-xs">Documento no válido como factura</div>
        </div>
      </header>
      <InvoiceBody inv={inv} />
    </div>
  );
}
