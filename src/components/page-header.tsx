import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: React.ReactNode;
  back?: { href: string; label: string };
  description?: React.ReactNode;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
};

/** Encabezado de pantalla: volver, título, explicación y acciones. */
export function PageHeader({ title, back, description, actions, badges }: Props) {
  return (
    <div className="space-y-2">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 inline-flex h-9 items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {badges}
          </div>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 *:flex-1 sm:*:flex-none">{actions}</div>}
      </div>
    </div>
  );
}
