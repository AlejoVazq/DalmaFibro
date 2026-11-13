import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  info: { icon: Info, cls: "border-info/30 bg-info/8 [&>svg]:text-info" },
  success: { icon: CheckCircle2, cls: "border-success/30 bg-success/10 [&>svg]:text-success" },
  warning: { icon: AlertTriangle, cls: "border-warning/40 bg-warning/10 [&>svg]:text-warning" },
  error: { icon: XCircle, cls: "border-destructive/30 bg-destructive/8 [&>svg]:text-destructive" },
} as const;

type Props = {
  tone: keyof typeof TONES;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

/** Aviso con ícono. Se usa para resultados de formularios y alertas. */
export function Notice({ tone, title, children, className }: Props) {
  const { icon: Icon, cls } = TONES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("anim-in flex gap-3 rounded-lg border p-3 text-sm", cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <div className="font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}
