import { PrismaClient } from "@prisma/client";
import { seedMaterials } from "./materials";

const prisma = new PrismaClient();

async function main() {
  await seedMaterials(prisma);
}

main().finally(() => prisma.$disconnect());
