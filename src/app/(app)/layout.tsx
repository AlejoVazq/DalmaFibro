import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { can, type Action } from "@/lib/auth/permissions";
import { logoutAction } from "@/app/login/actions";

const NAV: { href: string; label: string; action?: Action }[] = [
  { href: "/", label: "Inicio" },
  { href: "/pedidos", label: "Pedidos", action: "orders.view" },
  { href: "/stock", label: "Stock", action: "stock.view" },
  { href: "/comprobantes", label: "Comprobantes", action: "invoices.view" },
  { href: "/catalogo", label: "Catálogo", action: "catalog.edit" },
  { href: "/usuarios", label: "Usuarios", action: "users.manage" },
];

const ROLE_LABEL = { ADMIN: "Admin", TALLER: "Taller", DALMATA: "Dalmata" } as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-semibold mr-2">Gestión Dalmata</span>
          {NAV.filter((n) => n.action === undefined || can(user, n.action)).map((n) => (
            <Link key={n.href} href={n.href} className="hover:underline">
              {n.label}
            </Link>
          ))}
          <span className="ml-auto text-muted-foreground">
            {user.name} · {ROLE_LABEL[user.role]}
          </span>
          <form action={logoutAction}>
            <button className="hover:underline" type="submit">
              Salir
            </button>
          </form>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
