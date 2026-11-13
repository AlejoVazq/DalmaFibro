import type { StockLevel } from "@/domain/stock-levels";
import { cn } from "@/lib/utils";

/** Etiqueta corta del nivel de stock libre de un herraje. */
export function StockLevelChip({ level, available, className }: { level: StockLevel; available: number; className?: string }) {
  if (level === "ok") return null;
  const { text, cls } = {
    falta: { text: `Faltan ${-available}`, cls: "bg-destructive text-white" },
    critico: { text: "Pedir ya", cls: "bg-destructive text-white" },
    bajo: { text: "Queda poco", cls: "bg-warning text-white" },
  }[level];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", cls, className)}>{text}</span>
  );
}
