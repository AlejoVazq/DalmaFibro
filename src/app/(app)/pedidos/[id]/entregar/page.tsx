import { randomUUID } from "node:crypto";
import { PackageCheck, Truck } from "lucide-react";
import { requireUser } from "@/lib/auth/current";
import { assertCan } from "@/lib/auth/permissions";
import { getOrder, getPendingByLine } from "@/domain/orders";
import { ActionForm } from "@/components/action-form";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isoLocalDateTime } from "@/lib/format";
import { PICKUP_LABEL } from "@/lib/labels";
import { registerDeliveryAction } from "../../delivery-actions";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function DeliverPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  assertCan(actor, "deliveries.create");
  const { id } = await params;
  const [order, pending] = await Promise.all([getOrder(actor, id), getPendingByLine(id)]);
  const lines = order.lines.filter((l) => (pending.get(l.id) ?? 0) > 0);

  return (
    <div className="max-w-xl space-y-5">
      <PageHeader
        title="Registrar entrega"
        back={{ href: `/pedidos/${id}`, label: `Pedido #${order.number}` }}
        description="Al confirmar, se descuentan los herrajes del stock."
      />
      {lines.length === 0 ? (
        <EmptyState icon={PackageCheck} title="No quedan cajas pendientes de entregar" />
      ) : (
        <ActionForm action={registerDeliveryAction} className="space-y-4" resetOnSuccess={false}>
          <input type="hidden" name="orderId" value={id} />
          {/* Se genera una vez por pantalla: si se envía dos veces, no se descuenta doble. */}
          <input type="hidden" name="requestId" value={randomUUID()} />

          <Block title="¿Cuántas cajas se llevan?">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <input type="hidden" name="lineId" value={l.id} />
                <Label htmlFor={`qty_${l.id}`} className="block flex-1 font-normal">
                  <span className="font-medium">{l.boxType.name}</span>{" "}
                  <span className="text-muted-foreground">{l.withLogo ? "con logo" : "sin logo"}</span>
                  <span className="block text-sm text-muted-foreground">de {pending.get(l.id)} pendientes</span>
                </Label>
                <Input
                  id={`qty_${l.id}`}
                  name={`qty_${l.id}`}
                  type="number"
                  min="0"
                  max={pending.get(l.id)}
                  step="1"
                  defaultValue={pending.get(l.id)}
                  className="w-24 text-center text-lg font-semibold"
                  inputMode="numeric"
                />
              </div>
            ))}
          </Block>

          <Block title="¿Quién se las lleva?">
            <div className="space-y-1.5">
              <Label htmlFor="pickupType">Tipo</Label>
              <NativeSelect id="pickupType" name="pickupType" defaultValue="FLETERO">
                {Object.entries(PICKUP_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pickupName">Nombre de la persona o empresa</Label>
              <Input id="pickupName" name="pickupName" required />
            </div>
          </Block>

          <Block title="¿Cuándo?">
            <div className="space-y-1.5">
              <Label htmlFor="deliveredAt">Día y hora</Label>
              <Input id="deliveredAt" name="deliveredAt" type="datetime-local" defaultValue={isoLocalDateTime(new Date())} required />
              <p className="text-sm text-muted-foreground">Ya viene con la hora de ahora; cambiala solo si fue otro día.</p>
            </div>
          </Block>

          <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel="Registrando…">
            <Truck aria-hidden /> Confirmar entrega
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
