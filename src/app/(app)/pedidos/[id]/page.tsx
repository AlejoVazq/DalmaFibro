import { FileImage, FileText, Pencil, Truck, Upload, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { editableStatuses, getOrder, getPendingByLine } from "@/domain/orders";
import { ActionForm } from "@/components/action-form";
import { StatusBadge } from "@/components/status-badge";
import { LinkButton } from "@/components/link-button";
import { PageHeader } from "@/components/page-header";
import { PriorityChip } from "@/components/order-card";
import { Stepper } from "@/components/stepper";
import { Notice } from "@/components/notice";
import { EmptyState } from "@/components/empty-state";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Input } from "@/components/ui/input";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { orderSteps } from "@/lib/steps";
import type { Shortage } from "@/domain/shortage";
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

const HINT_TALLER: Record<string, string> = {
  RECIBIDO: "Cuando empieces a fabricarlo, pasalo a producción.",
  EN_PRODUCCION: "Cuando terminen las cajas, marcalo listo: Dalmata lo va a ver en su inicio.",
  LISTO: "Cuando se lleven las cajas, registrá la entrega.",
  PARCIAL: "Todavía quedan cajas por entregar.",
  ENTREGADO: "Pedido entregado completo.",
};

const HINT_DALMATA: Record<string, string> = {
  RECIBIDO: "El taller todavía no lo empezó. Si hace falta, podés editarlo o cancelarlo.",
  EN_PRODUCCION: "El taller lo está fabricando.",
  LISTO: "¡Está listo! Ya se puede pasar a retirar.",
  PARCIAL: "Ya se retiró una parte; el resto sigue en el taller.",
  ENTREGADO: "Pedido entregado completo.",
};

function StatusForm({ orderId, to, label, primary }: { orderId: string; to: string; label: string; primary: boolean }) {
  return (
    <ActionForm action={setStatusAction} className="contents">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="to" value={to} />
      <SubmitButton variant={primary ? "default" : "outline"} size={primary ? "lg" : "default"}>
        {label}
      </SubmitButton>
    </ActionForm>
  );
}

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
  const anyPending = [...pending.values()].some((n) => n > 0);
  const deliverable =
    ["EN_PRODUCCION", "LISTO", "PARCIAL"].includes(order.status) && anyPending && can(actor, "deliveries.create");

  const transitions = can(actor, "orders.changeStatus") ? (NEXT_STATUS[order.status] ?? []) : [];
  const forward = transitions.filter((t) => !t.label.startsWith("Volver"));
  const back = transitions.filter((t) => t.label.startsWith("Volver"));
  const steps = orderSteps(order.status);
  const hint = (actor.role === "DALMATA" ? HINT_DALMATA : HINT_TALLER)[order.status];
  const deliverIsMain = deliverable && forward.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pedido #${order.number}`}
        back={{ href: "/pedidos", label: "Pedidos" }}
        badges={
          <>
            <StatusBadge status={order.status} />
            <PriorityChip priority={order.priority} />
          </>
        }
        description={
          <>
            Cargado el {fmtDateTime(order.createdAt)} por {order.createdBy.name}
            {order.desiredDate && (
              <>
                {" · "}
                <span className="font-medium text-foreground">Lo necesitan para el {fmtDate(order.desiredDate)}</span>
              </>
            )}
          </>
        }
      />

      {steps ? <Stepper steps={steps} /> : <Notice tone="error" title="Este pedido fue cancelado" />}

      {(hint || forward.length > 0 || deliverable) && steps && (
        <section className="space-y-3 rounded-xl border-2 border-primary/25 bg-accent/40 p-4">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">Siguiente paso</h2>
            {hint && <p className="mt-1 text-base">{hint}</p>}
          </div>
          {(forward.length > 0 || deliverable) && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {forward.map((s) => (
                <StatusForm key={s.to} orderId={order.id} to={s.to} label={s.label} primary />
              ))}
              {deliverable && (
                <LinkButton
                  href={`/pedidos/${order.id}/entregar`}
                  variant={deliverIsMain ? "default" : "outline"}
                  size={deliverIsMain ? "lg" : "default"}
                >
                  <Truck aria-hidden /> Registrar entrega
                </LinkButton>
              )}
            </div>
          )}
        </section>
      )}

      {order.materialsOrderedAt && (
        <Notice tone="warning" title="Materiales encargados">
          <p>Cuando se cargó el pedido no alcanzaban los herrajes. Faltaban:</p>
          <ul className="list-inside list-disc">
            {((order.materialsShortage ?? []) as Shortage[]).map((s) => (
              <li key={s.code}>
                <strong>{s.missing}</strong> {s.name.toLowerCase()}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            {order.materialsOrderedByName} marcó que ya los encargó, el {fmtDateTime(order.materialsOrderedAt)}.
          </p>
        </Notice>
      )}

      {order.notes && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground">Observaciones</h2>
          <p className="rounded-xl border bg-card p-4 whitespace-pre-wrap">{order.notes}</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cajas</h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {order.lines.map((l) => {
            const left = pending.get(l.id) ?? 0;
            return (
              <li key={l.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    {l.quantity} × {l.boxType.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {l.withLogo ? "Con logo grabado" : "Sin logo"}
                    {l.engravingNotes && <> · {l.engravingNotes}</>}
                  </div>
                </div>
                <div className={`text-sm font-medium ${left > 0 ? "text-foreground" : "text-success"}`}>
                  {left > 0 ? `Faltan entregar ${left}` : "Entregadas todas"}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mockups</h2>
        {order.mockups.length === 0 ? (
          <EmptyState icon={FileImage} title="Sin mockups" hint={editable ? "Podés subir fotos o PDF del diseño acá abajo." : undefined} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {order.mockups.map((m) => (
              <a
                key={m.id}
                href={`/api/mockups/${m.id}`}
                target="_blank"
                className="overflow-hidden rounded-xl border bg-card text-sm transition-colors hover:border-primary/40"
              >
                {m.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/mockups/${m.id}`} alt={m.filename} className="h-32 w-full bg-muted object-contain" />
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center gap-1 bg-muted text-muted-foreground">
                    <FileText className="size-8" aria-hidden /> PDF
                  </div>
                )}
                <div className="truncate p-2">{m.filename}</div>
              </a>
            ))}
          </div>
        )}
        {editable && (
          <ActionForm action={uploadMockupAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input type="hidden" name="orderId" value={order.id} />
            <Input
              name="mockups"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,application/pdf"
              aria-label="Elegir mockups"
              className="sm:max-w-sm"
              required
            />
            <SubmitButton variant="outline" pendingLabel="Subiendo…">
              <Upload aria-hidden /> Subir mockups
            </SubmitButton>
          </ActionForm>
        )}
      </section>

      <DeliveriesSection actor={actor} order={order} pending={pending} />

      {(editable || cancellable || back.length > 0) && (
        <section className="space-y-3 border-t pt-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Otras acciones</h2>
          <div className="flex flex-wrap gap-2">
            {editable && (
              <LinkButton href={`/pedidos/${order.id}/editar`} variant="outline">
                <Pencil aria-hidden /> Editar pedido
              </LinkButton>
            )}
            {back.map((s) => (
              <StatusForm key={s.to} orderId={order.id} to={s.to} label={s.label} primary={false} />
            ))}
            {cancellable && (
              <ActionForm action={cancelOrderAction} className="contents">
                <input type="hidden" name="orderId" value={order.id} />
                <ConfirmSubmit
                  label="Cancelar pedido"
                  icon={<XCircle aria-hidden />}
                  question={`¿Cancelar el pedido #${order.number}? No se puede deshacer.`}
                  confirmLabel="Sí, cancelar"
                />
              </ActionForm>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
