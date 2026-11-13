import type { LucideIcon } from "lucide-react";

type Props = { icon: LucideIcon; title: string; hint?: React.ReactNode; action?: React.ReactNode };

/** Lista o pantalla vacía que dice qué hacer. */
export function EmptyState({ icon: Icon, title, hint, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-4 py-8 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <div className="font-medium">{title}</div>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
