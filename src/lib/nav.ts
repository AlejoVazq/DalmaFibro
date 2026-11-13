import { can, type Action, type SessionUser } from "@/lib/auth/permissions";

export type NavIcon = "home" | "orders" | "stock" | "invoices" | "catalog" | "users" | "more";
export type NavItem = { href: string; label: string; icon: NavIcon };

const MAIN: (NavItem & { action?: Action })[] = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/pedidos", label: "Pedidos", icon: "orders", action: "orders.view" },
  { href: "/stock", label: "Stock", icon: "stock", action: "stock.view" },
  { href: "/comprobantes", label: "Comprobantes", icon: "invoices", action: "invoices.view" },
];

const MORE: (NavItem & { action: Action })[] = [
  { href: "/catalogo", label: "Catálogo", icon: "catalog", action: "catalog.edit" },
  { href: "/usuarios", label: "Usuarios", icon: "users", action: "users.manage" },
];

const strip = ({ href, label, icon }: NavItem): NavItem => ({ href, label, icon });

export function mainItems(user: SessionUser): NavItem[] {
  return MAIN.filter((n) => !n.action || can(user, n.action)).map(strip);
}

export function moreItems(user: SessionUser): NavItem[] {
  return MORE.filter((n) => can(user, n.action)).map(strip);
}

export const MORE_ITEM: NavItem = { href: "/mas", label: "Más", icon: "more" };

export function bottomBarItems(user: SessionUser): NavItem[] {
  return [...mainItems(user), MORE_ITEM];
}

const matches = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function isActive(pathname: string, href: string, user?: SessionUser): boolean {
  if (href === MORE_ITEM.href && user) {
    return matches(pathname, href) || moreItems(user).some((i) => matches(pathname, i.href));
  }
  return matches(pathname, href);
}
