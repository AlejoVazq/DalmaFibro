import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Mockup } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { assertCan, type SessionUser } from "@/lib/auth/permissions";
import { editableStatuses, lockOrder } from "./orders";

export const MOCKUP_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
export const MOCKUP_MAX_BYTES = 20 * 1024 * 1024;

const uploadDir = () => path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

export async function saveMockup(
  actor: SessionUser,
  input: { orderId: string; orderLineId?: string; file: File },
): Promise<Mockup> {
  assertCan(actor, "orders.edit");
  const { file } = input;
  if (!MOCKUP_TYPES.includes(file.type) || file.size === 0 || file.size > MOCKUP_MAX_BYTES) {
    throw new DomainError("INVALID_FILE");
  }
  const storedName = randomUUID();
  return prisma.$transaction(async (tx) => {
    const status = await lockOrder(tx, input.orderId);
    if (!editableStatuses(actor).includes(status)) throw new DomainError("ORDER_LOCKED");
    if (input.orderLineId) {
      const line = await tx.orderLine.findFirst({ where: { id: input.orderLineId, orderId: input.orderId } });
      if (!line) throw new DomainError("NOT_FOUND");
    }
    await mkdir(uploadDir(), { recursive: true });
    await writeFile(path.join(uploadDir(), storedName), Buffer.from(await file.arrayBuffer()));
    return tx.mockup.create({
      data: {
        orderId: input.orderId,
        orderLineId: input.orderLineId,
        filename: path.basename(file.name).slice(0, 200) || "archivo",
        storedName,
        mimeType: file.type,
        size: file.size,
        uploadedById: actor.id,
      },
    });
  });
}

export async function readMockup(
  actor: SessionUser,
  id: string,
): Promise<{ data: Buffer; mimeType: string; filename: string }> {
  assertCan(actor, "orders.view");
  const m = await prisma.mockup.findUnique({ where: { id } });
  if (!m) throw new DomainError("NOT_FOUND");
  const data = await readFile(path.join(uploadDir(), m.storedName));
  return { data, mimeType: m.mimeType, filename: m.filename };
}
