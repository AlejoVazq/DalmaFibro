import type { Prisma } from "@prisma/client";

export const TZ = "America/Argentina/Buenos_Aires";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export function fmtMoney(v: Prisma.Decimal | number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return money.format(typeof v === "number" ? v : v.toNumber());
}

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-AR", { timeZone: TZ });
}

export function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("es-AR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" });
}

/** YYYY-MM-DD en hora argentina, para inputs type=date. */
export function isoDay(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Valor para input datetime-local en hora argentina. */
export function isoLocalDateTime(d: Date): string {
  const s = d.toLocaleString("sv-SE", { timeZone: TZ });
  return s.slice(0, 16).replace(" ", "T");
}

/** Convierte un valor de input datetime-local (hora argentina) a Date. */
export function fromLocalDateTime(v: string): Date {
  return new Date(`${v}:00-03:00`);
}
