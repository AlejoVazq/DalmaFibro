import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedMaterials } from "./materials";

const prisma = new PrismaClient();

async function main() {
  await seedMaterials(prisma);
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) {
    const exists = await prisma.user.findUnique({ where: { username } });
    if (!exists) {
      await prisma.user.create({
        data: { username, name: username, role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
      });
      console.log("Usuario admin creado: " + username);
    }
  }
}

main().finally(() => prisma.$disconnect());
