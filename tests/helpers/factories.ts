import bcrypt from "bcryptjs";
import type { BoxType, Material, Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import type { MaterialCode } from "../../prisma/materials";

export type { SessionUser } from "@/lib/auth/permissions";

let seq = 0;

export async function makeUser(
  role: Role,
  overrides: { username?: string; password?: string; name?: string } = {},
): Promise<SessionUser> {
  seq++;
  const u = await prisma.user.create({
    data: {
      username: overrides.username ?? `${role.toLowerCase()}${seq}`,
      name: overrides.name ?? `${role} ${seq}`,
      role,
      passwordHash: await bcrypt.hash(overrides.password ?? "password123", 4),
    },
  });
  return { id: u.id, name: u.name, role: u.role };
}

export async function material(code: MaterialCode): Promise<Material> {
  return prisma.material.findUniqueOrThrow({ where: { code } });
}

export async function makeBoxType(
  opts: { name?: string; price?: number; recipe?: Partial<Record<MaterialCode, number>> } = {},
): Promise<BoxType> {
  seq++;
  const recipe = opts.recipe ?? { TORNILLO: 12, BISAGRA: 2, CIERRE_A: 1 };
  const creator = await makeUser("ADMIN");
  const bt = await prisma.boxType.create({ data: { name: opts.name ?? `Caja ${seq}` } });
  for (const [code, qty] of Object.entries(recipe)) {
    const m = await material(code as MaterialCode);
    await prisma.recipeItem.create({ data: { boxTypeId: bt.id, materialId: m.id, qtyPerBox: qty! } });
  }
  await prisma.priceEntry.create({
    data: {
      boxTypeId: bt.id,
      unitPrice: opts.price ?? 1000,
      validFrom: new Date("2026-01-01T00:00:00-03:00"),
      createdById: creator.id,
    },
  });
  return bt;
}
