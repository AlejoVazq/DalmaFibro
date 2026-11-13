import { can, type Action, type SessionUser } from "@/lib/auth/permissions";

export type StockActionKey = "ingreso" | "retiro" | "uso" | "descarte" | "llegada" | "ajuste";
export type StockActionInfo = { key: StockActionKey; title: string; help: string };

const ACTIONS: (StockActionInfo & { action: Action })[] = [
  { key: "ingreso", title: "Llegaron herrajes al taller", help: "Sumá bisagras, cierres o tornillos que compraste.", action: "stock.move" },
  { key: "retiro", title: "Retiré placas de Dalmata", help: "Las placas pasan de Dalmata al taller.", action: "stock.move" },
  { key: "uso", title: "Usé o descarté placas", help: "Placas que se gastaron o rompieron en el taller.", action: "stock.move" },
  { key: "descarte", title: "Herrajes fallados", help: "Descontá los que se rompieron o vinieron mal.", action: "stock.move" },
  { key: "llegada", title: "Llegaron placas a Dalmata", help: "Placas que dejó el proveedor en Dalmata.", action: "stock.registerArrival" },
  { key: "ajuste", title: "Corregir un conteo", help: "Si contaste y no coincide, cargá la diferencia.", action: "stock.move" },
];

/** Las acciones de stock que puede hacer el usuario, en orden de uso habitual. */
export function stockActionsFor(user: SessionUser): StockActionInfo[] {
  return ACTIONS.filter((a) => can(user, a.action)).map(({ key, title, help }) => ({ key, title, help }));
}
