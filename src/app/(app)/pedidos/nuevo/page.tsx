import { BookOpen } from "lucide-react";
import { requireUser } from "@/lib/auth/current";
import { assertCan, can } from "@/lib/auth/permissions";
import { listBoxTypes } from "@/domain/catalog";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LinkButton } from "@/components/link-button";
import { createOrderAction } from "../actions";
import { OrderForm } from "../order-form";

export default async function NewOrderPage() {
  const actor = await requireUser();
  assertCan(actor, "orders.create");
  const boxTypes = await listBoxTypes({});
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Nuevo pedido"
        back={{ href: "/pedidos", label: "Pedidos" }}
        description="Completá los 3 pasos y tocá «Crear pedido»."
      />
      {boxTypes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Todavía no hay tipos de caja"
          hint={can(actor, "catalog.edit") ? "Primero cargá los tipos de caja en el catálogo." : "Pedile al taller que cargue los tipos de caja."}
          action={can(actor, "catalog.edit") && <LinkButton href="/catalogo">Ir al catálogo</LinkButton>}
        />
      ) : (
        <OrderForm action={createOrderAction} boxTypes={boxTypes.map(({ id, name }) => ({ id, name }))} submitLabel="Crear pedido" />
      )}
    </div>
  );
}
