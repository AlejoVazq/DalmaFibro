import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { assertCan } from "@/lib/auth/permissions";
import { getOrder, getPendingByLine } from "@/domain/orders";
import { ActionForm } from "@/components/action-form";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isoLocalDateTime } from "@/lib/format";
import { PICKUP_LABEL } from "@/lib/labels";
import { registerDeliveryAction } from "../../delivery-actions";

export default async function DeliverPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  assertCan(actor, "deliveries.create");
  const { id } = await params;
  const [order, pending] = await Promise.all([getOrder(actor, id), getPendingByLine(id)]);
  const lines = order.lines.filter((l) => (pending.get(l.id) ?? 0) > 0);

  return (
    <div className="space-y-4 max-w-xl">
      <Link href={`/pedidos/${id}`} className="text-sm hover:underline">
        ← Pedido #{order.number}
      </Link>
      <h1 className="text-xl font-semibold">Registrar entrega — pedido #{order.number}</h1>
      {lines.length === 0 ? (
        <p className="text-muted-foreground">No quedan cajas pendientes de entregar.</p>
      ) : (
        <ActionForm action={registerDeliveryAction} className="space-y-4" resetOnSuccess={false}>
          <input type="hidden" name="orderId" value={id} />
          {/* Se genera una vez por pantalla: si se envía dos veces, no se descuenta doble. */}
          <input type="hidden" name="requestId" value={randomUUID()} />
          <div className="space-y-1">
            <Label htmlFor="deliveredAt">Día y hora del despacho</Label>
            <Input id="deliveredAt" name="deliveredAt" type="datetime-local" defaultValue={isoLocalDateTime(new Date())} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pickupType">Quién retiró</Label>
            <NativeSelect id="pickupType" name="pickupType" defaultValue="FLETERO">
              {Object.entries(PICKUP_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pickupName">Nombre de la persona o empresa</Label>
            <Input id="pickupName" name="pickupName" required />
          </div>
          <fieldset className="border rounded-md p-3 space-y-2">
            <legend className="text-sm px-1">Cajas que se llevan</legend>
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-2">
                <input type="hidden" name="lineId" value={l.id} />
                <Label htmlFor={`qty_${l.id}`} className="flex-1">
                  {l.boxType.name} {l.withLogo ? "(con logo)" : "(sin logo)"} — pendientes {pending.get(l.id)}
                </Label>
                <Input
                  id={`qty_${l.id}`}
                  name={`qty_${l.id}`}
                  type="number"
                  min="0"
                  max={pending.get(l.id)}
                  step="1"
                  defaultValue={pending.get(l.id)}
                  className="w-24"
                  inputMode="numeric"
                />
              </div>
            ))}
          </fieldset>
          <Button type="submit">Confirmar entrega</Button>
        </ActionForm>
      )}
      <Link href={`/pedidos/${id}`} className="text-sm hover:underline block">
        Volver al pedido
      </Link>
    </div>
  );
}
