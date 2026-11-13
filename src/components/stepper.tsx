import { Check } from "lucide-react";
import type { Step } from "@/lib/steps";
import { cn } from "@/lib/utils";

/** Línea de pasos: muestra en qué etapa está algo y qué falta. */
export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex gap-1 rounded-xl border bg-card p-3 sm:p-4" aria-label="Etapas">
      {steps.map((s, i) => (
        <li key={s.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center" aria-current={s.state === "current" ? "step" : undefined}>
          <div className="flex w-full items-center">
            <span className={cn("h-0.5 flex-1", i === 0 ? "invisible" : s.state === "todo" ? "bg-border" : "bg-primary")} />
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                s.state === "done" && "border-primary bg-primary text-primary-foreground",
                s.state === "current" && "border-primary bg-accent text-primary ring-4 ring-primary/15",
                s.state === "todo" && "border-border bg-card text-muted-foreground",
              )}
            >
              {s.state === "done" ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                "h-0.5 flex-1",
                i === steps.length - 1 ? "invisible" : steps[i + 1].state === "todo" ? "bg-border" : "bg-primary",
              )}
            />
          </div>
          <span
            className={cn(
              "text-xs leading-tight sm:text-sm",
              s.state === "current" ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
