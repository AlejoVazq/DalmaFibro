import type { SessionUser } from "@/lib/auth/permissions";
import type { getOrder } from "@/domain/orders";

type Props = {
  actor: SessionUser;
  order: Awaited<ReturnType<typeof getOrder>>;
  pending: Map<string, number>;
};

/** Sección de entregas del pedido (se completa en la tarea de entregas). */
export function DeliveriesSection(props: Props) {
  void props;
  return null;
}
