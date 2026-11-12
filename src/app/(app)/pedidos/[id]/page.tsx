import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { editableStatuses, getOrder, getPendingByLine } from "@/domain/orders";
import { ActionForm } from "@/components/action-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Input } from "@/components/ui/input";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PRIORITY_LABEL } from "@/lib/labels";
import { cancelOrderAction, setStatusAction, uploadMockupAction } from "../actions";
import { DeliveriesSection } from "./deliveries-section";

const NEXT_STATUS: Record<string, { to: string; label: string }[]> = {
  RECIBIDO: [{ to: "EN_PRODUCCION", label: "Pasar a producción" }],
  EN_PRODUCCION: [
    { to: "LISTO", label: "Marcar listo para retirar" },
    { to: "RECIBIDO", label: "Volver a recibido" },
  ],
  LISTO: [{ to: "EN_PRODUCCION", label: "Volver a producción" }],
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  const order = await getOrder(actor, id);
  const pending = await getPendingByLine(id);
  const hasDeliveries = order.deliveries.some((d) => d.annulledAt === null);
  const editable = can(actor, "orders.edit") && editableStatuses(actor).includes(order.status) && !hasDeliveries;
  const cancellable =
    can(actor, "orders.edit") &&
    (actor.role === "DALMATA" ? order.status === "RECIBIDO" : ["RECIBIDO", "EN_PRODUCCION"].includes(order.status));

  return (
    <div className="space-y-6">
      <Link href="/pedidos" className="text-sm hover:underline">
        ← Pedidos
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Pedido #{order.number}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm">Prioridad {PRIORITY_LABEL[order.priority]}</span>
      </div>
      <div className="text-sm text-muted-foreground">
        Creado el {fmtDateTime(order.createdAt)} por {order.createdBy.name}
        {order.desiredDate && <> · Fecha deseada: {fmtDate(order.desiredDate)}</>}
      </div>
      {order.notes && <p className="text-sm whitespace-pre-wrap border rounded-md p-3">{order.notes}</p>}

      <section className="space-y-2">
        <h2 className="font-semibold">Cajas</h2>
        <table className="w-full text-sm border rounded-md">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Tipo</th>
              <th className="p-2 text-right">Cantidad</th>
              <th className="p-2 text-right">Pendiente</th>
              <th className="p-2">Logo</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.id} className="border-t align-top">
                <td className="p-2">{l.boxType.name}</td>
                <td className="p-2 text-right">{l.quantity}</td>
                <td className="p-2 text-right">{pending.get(l.id)}</td>
                <td className="p-2">
                  {l.withLogo ? "Sí" : "No"}
                  {l.engravingNotes && <div className="text-muted-foreground">{l.engravingNotes}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="flex flex-wrap gap-2">
        {can(actor, "orders.changeStatus") &&
          (NEXT_STATUS[order.status] ?? []).map((s) => (
            <ActionForm key={s.to} action={setStatusAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="to" value={s.to} />
              <Button type="submit" variant={s.label.startsWith("Volver") ? "outline" : "default"}>
                {s.label}
              </Button>
            </ActionForm>
          ))}
        {editable && (
          <LinkButton href={`/pedidos/${order.id}/editar`} variant="outline">
            Editar
          </LinkButton>
        )}
        {cancellable && (
          <ActionForm action={cancelOrderAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <Button type="submit" variant="destructive">
              Cancelar pedido
            </Button>
          </ActionForm>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Mockups</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {order.mockups.map((m) => (
            <a key={m.id} href={`/api/mockups/${m.id}`} target="_blank" className="border rounded-md p-2 text-sm hover:bg-muted/40">
              {m.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/mockups/${m.id}`} alt={m.filename} className="w-full h-32 object-contain" />
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground">PDF</div>
              )}
              <div className="truncate mt-1">{m.filename}</div>
            </a>
          ))}
          {order.mockups.length === 0 && <p className="text-sm text-muted-foreground">Sin mockups.</p>}
        </div>
        {editable && (
          <ActionForm action={uploadMockupAction} className="flex flex-wrap gap-2 items-center">
            <input type="hidden" name="orderId" value={order.id} />
            <Input name="mockups" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" className="max-w-xs" />
            <Button type="submit" variant="outline">
              Subir
            </Button>
          </ActionForm>
        )}
      </section>

      <DeliveriesSection actor={actor} order={order} pending={pending} />
    </div>
  );
}
