import { Prisma } from "@prisma/client";

type Num = number | string | Prisma.Decimal;

export function toDecimal(v: Num): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

export function mul(a: Num, b: Num): Prisma.Decimal {
  return toDecimal(a).mul(toDecimal(b));
}

export function sum(xs: Num[]): Prisma.Decimal {
  return xs.reduce<Prisma.Decimal>((acc, x) => acc.add(toDecimal(x)), toDecimal(0));
}
