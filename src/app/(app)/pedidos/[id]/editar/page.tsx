import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { getOrder } from "@/domain/orders";
import { listBoxTypes } from "@/domain/catalog";
import { isoDay } from "@/lib/format";
import { updateOrderAction } from "../../actions";
import { OrderForm } from "../../order-form";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  const [order, boxTypes] = await Promise.all([getOrder(actor, id), listBoxTypes({})]);
  return (
    <div className="space-y-4 max-w-2xl">
      <Link href={`/pedidos/${id}`} className="text-sm hover:underline">
        ← Pedido #{order.number}
      </Link>
      <h1 className="text-xl font-semibold">Editar pedido #{order.number}</h1>
      <OrderForm
        action={updateOrderAction}
        boxTypes={boxTypes}
        orderId={order.id}
        submitLabel="Guardar cambios"
        initial={{
          priority: order.priority,
          desiredDate: order.desiredDate ? isoDay(order.desiredDate) : "",
          notes: order.notes ?? "",
          lines: order.lines.map((l) => ({
            boxTypeId: l.boxTypeId,
            quantity: l.quantity,
            withLogo: l.withLogo,
            engravingNotes: l.engravingNotes ?? "",
          })),
        }}
      />
    </div>
  );
}
