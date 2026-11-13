import { BookOpen, ClipboardList, Home, Menu, Package, Receipt, Users, type LucideIcon } from "lucide-react";
import type { NavIcon as NavIconName } from "@/lib/nav";

const ICONS: Record<NavIconName, LucideIcon> = {
  home: Home,
  orders: ClipboardList,
  stock: Package,
  invoices: Receipt,
  catalog: BookOpen,
  users: Users,
  more: Menu,
};

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden />;
}
