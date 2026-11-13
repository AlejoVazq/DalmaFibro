import { PageHeader } from "@/components/page-header";
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
    <div className="max-w-2xl space-y-5">
      <PageHeader title={`Editar pedido #${order.number}`} back={{ href: `/pedidos/${id}`, label: `Pedido #${order.number}` }} />
      <OrderForm
        action={updateOrderAction}
        boxTypes={boxTypes.map(({ id, name }) => ({ id, name }))}
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
