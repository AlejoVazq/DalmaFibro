import type { Role } from "@prisma/client";
import { ForbiddenError } from "@/lib/errors";

export type SessionUser = { id: string; name: string; role: Role };

export type Action =
  | "users.manage"
  | "catalog.edit"
  | "prices.edit"
  | "orders.create"
  | "orders.edit"
  | "orders.changeStatus"
  | "orders.view"
  | "stock.move"
  | "stock.registerArrival"
  | "stock.view"
  | "deliveries.create"
  | "invoices.create"
  | "invoices.changeStatus"
  | "invoices.view"
  | "export.excel"
  | "records.annul";

const DALMATA: Action[] = [
  "orders.create",
  "orders.edit",
  "orders.view",
  "stock.registerArrival",
  "stock.view",
  "invoices.view",
];

const TALLER_DENIED: Action[] = ["users.manage", "records.annul"];

export function can(user: SessionUser, action: Action): boolean {
  switch (user.role) {
    case "ADMIN":
      return true;
    case "TALLER":
      return !TALLER_DENIED.includes(action);
    case "DALMATA":
      return DALMATA.includes(action);
  }
}

export function assertCan(user: SessionUser, action: Action): void {
  if (!can(user, action)) throw new ForbiddenError();
}
