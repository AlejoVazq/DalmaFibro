"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Package } from "lucide-react";
import type { SessionUser } from "@/lib/auth/permissions";
import { isActive, mainItems, moreItems } from "@/lib/nav";
import { logoutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { NavIcon } from "./nav-icon";

const ROLE_LABEL = { ADMIN: "Admin", TALLER: "Taller", DALMATA: "Dalmata" } as const;

/** Menú lateral fijo para pantallas medianas y grandes. */
export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const items = [...mainItems(user), ...moreItems(user)];
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex print:hidden">
      <Link href="/" className="flex items-center gap-2 px-5 py-5 text-lg font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Package className="size-5" aria-hidden />
        </span>
        Gestión Dalmata
      </Link>
      <nav className="flex-1 space-y-1 px-3" aria-label="Secciones">
        {items.map((i) => {
          const active = isActive(pathname, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-3 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-accent text-accent-foreground hover:bg-accent",
              )}
            >
              <NavIcon name={i.icon} className="size-5" />
              {i.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="px-3 pb-2 text-sm">
          <div className="font-medium">{user.name}</div>
          <div className="text-muted-foreground">Perfil {ROLE_LABEL[user.role]}</div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex h-11 w-full items-center gap-3 rounded-lg px-3 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-5" aria-hidden />
            Salir
          </button>
        </form>
      </div>
    </aside>
  );
}
