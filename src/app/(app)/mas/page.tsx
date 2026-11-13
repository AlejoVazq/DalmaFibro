import Link from "next/link";
import { ChevronRight, History, LogOut, Scale, UserCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { moreItems } from "@/lib/nav";
import { logoutAction } from "@/app/login/actions";
import { NavIcon } from "@/components/app-shell/nav-icon";
import { PageHeader } from "@/components/page-header";

const ROLE_LABEL = { ADMIN: "Admin", TALLER: "Taller", DALMATA: "Dalmata" } as const;

function Row({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <li>
      <Link href={href} className="flex h-14 items-center gap-3 px-4 font-medium hover:bg-muted">
        {icon}
        <span className="flex-1">{label}</span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

export default async function MorePage() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <PageHeader title="Más" />

      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <UserCircle2 className="size-10 text-muted-foreground" aria-hidden />
        <div>
          <div className="font-semibold">{user.name}</div>
          <div className="text-sm text-muted-foreground">Perfil {ROLE_LABEL[user.role]}</div>
        </div>
      </div>

      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {moreItems(user).map((i) => (
          <Row key={i.href} href={i.href} label={i.label} icon={<NavIcon name={i.icon} className="size-5 text-primary" />} />
        ))}
        {can(user, "stock.view") && (
          <Row href="/stock/movimientos" label="Movimientos de stock" icon={<History className="size-5 text-primary" aria-hidden />} />
        )}
        {can(user, "invoices.view") && (
          <Row href="/comprobantes/saldo" label="Saldo de cuenta" icon={<Scale className="size-5 text-primary" aria-hidden />} />
        )}
      </ul>

      <form action={logoutAction}>
        <button
          type="submit"
          className="flex h-14 w-full items-center gap-3 rounded-xl border bg-card px-4 font-medium text-destructive hover:bg-destructive/5"
        >
          <LogOut className="size-5" aria-hidden />
          Salir
        </button>
      </form>
    </div>
  );
}
