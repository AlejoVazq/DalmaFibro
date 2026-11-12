import { getBalances } from "@/domain/stock";
import type { MaterialCode } from "@/lib/materials";

export async function balanceOf(code: MaterialCode) {
  const b = (await getBalances()).find((x) => x.code === code);
  if (!b) throw new Error(`material ${code} no encontrado`);
  return b;
}
