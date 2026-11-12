import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { assertCan } from "@/lib/auth/permissions";
import { listBoxTypes } from "@/domain/catalog";
import { createOrderAction } from "../actions";
import { OrderForm } from "../order-form";

export default async function NewOrderPage() {
  const actor = await requireUser();
  assertCan(actor, "orders.create");
  const boxTypes = await listBoxTypes({});
  return (
    <div className="space-y-4 max-w-2xl">
      <Link href="/pedidos" className="text-sm hover:underline">
        ← Pedidos
      </Link>
      <h1 className="text-xl font-semibold">Nuevo pedido</h1>
      {boxTypes.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay tipos de caja cargados en el catálogo.</p>
      ) : (
        <OrderForm action={createOrderAction} boxTypes={boxTypes} submitLabel="Crear pedido" />
      )}
    </div>
  );
}
