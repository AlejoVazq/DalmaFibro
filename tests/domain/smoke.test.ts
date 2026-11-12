import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";
import { material } from "../helpers/factories";

test("seed de materiales", async () => {
  await resetDb();
  expect(await prisma.material.count()).toBe(7);
  expect((await material("CIERRE_A")).unit).toBe("par");
});
