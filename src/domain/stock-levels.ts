import type { MaterialCode } from "@/lib/materials";

/**
 * Umbrales de aviso sobre el stock Libre (Hay − Reservado).
 * Bisagras: se asume paquete de 500 u (3 y 2 paquetes); ajustar cuando se confirme.
 * Cierres: se cuentan en pares, así que cada par ya es el menor entre macho y hembra.
 */
export const LOW_STOCK_THRESHOLDS: Partial<Record<MaterialCode, { bajo: number; critico: number }>> = {
  TORNILLO: { bajo: 2000, critico: 1000 },
  BISAGRA: { bajo: 1500, critico: 1000 },
  CIERRE_A: { bajo: 750, critico: 500 },
  CIERRE_B: { bajo: 750, critico: 500 },
};

export type StockLevel = "ok" | "bajo" | "critico" | "falta";

export function stockLevel(code: MaterialCode, available: number): StockLevel {
  if (available < 0) return "falta";
  const t = LOW_STOCK_THRESHOLDS[code];
  if (!t) return "ok";
  if (available <= t.critico) return "critico";
  if (available <= t.bajo) return "bajo";
  return "ok";
}
