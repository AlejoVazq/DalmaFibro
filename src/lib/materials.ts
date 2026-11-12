import type { MaterialKind, PrismaClient } from "@prisma/client";

export const MATERIAL_CODES = [
  "TORNILLO",
  "BISAGRA",
  "CIERRE_A",
  "CIERRE_B",
  "PLACA_GRUESA",
  "PLACA_TAPAS_FONDOS",
  "PLACA_MDF_NEGRO",
] as const;
export type MaterialCode = (typeof MATERIAL_CODES)[number];

export const MATERIALS: { code: MaterialCode; name: string; unit: string; kind: MaterialKind }[] = [
  { code: "TORNILLO", name: "Tornillos", unit: "u", kind: "HERRAJE" },
  { code: "BISAGRA", name: "Bisagras", unit: "u", kind: "HERRAJE" },
  { code: "CIERRE_A", name: "Cierre tipo A", unit: "par", kind: "HERRAJE" },
  { code: "CIERRE_B", name: "Cierre tipo B", unit: "par", kind: "HERRAJE" },
  { code: "PLACA_GRUESA", name: "Placa gruesa", unit: "placa", kind: "PLACA" },
  { code: "PLACA_TAPAS_FONDOS", name: "Placa para tapas y fondos", unit: "placa", kind: "PLACA" },
  { code: "PLACA_MDF_NEGRO", name: "Placa MDF negro", unit: "placa", kind: "PLACA" },
];

export async function seedMaterials(db: Pick<PrismaClient, "material">) {
  for (const m of MATERIALS) {
    await db.material.upsert({ where: { code: m.code }, update: {}, create: m });
  }
}
