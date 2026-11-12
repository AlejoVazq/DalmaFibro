import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth/password";
import { assertCan, type SessionUser } from "@/lib/auth/permissions";

function checkPassword(pw: string) {
  if (pw.length < 8) throw new DomainError("PASSWORD_TOO_SHORT");
}

export async function createUser(
  actor: SessionUser,
  input: { username: string; name: string; role: Role; password: string },
): Promise<User> {
  assertCan(actor, "users.manage");
  const username = input.username.trim().toLowerCase();
  if (!username || !input.name.trim()) throw new DomainError("INVALID_INPUT");
  checkPassword(input.password);
  if (await prisma.user.findUnique({ where: { username } })) throw new DomainError("USERNAME_TAKEN");
  return prisma.user.create({
    data: {
      username,
      name: input.name.trim(),
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
  });
}

export async function setUserActive(actor: SessionUser, userId: string, active: boolean): Promise<void> {
  assertCan(actor, "users.manage");
  if (!active && userId === actor.id) throw new DomainError("SELF_DEACTIVATE");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { active } });
    if (!active) await tx.session.deleteMany({ where: { userId } });
  });
}

export async function resetPassword(actor: SessionUser, userId: string, newPassword: string): Promise<void> {
  assertCan(actor, "users.manage");
  checkPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
}

export async function listUsers(actor: SessionUser) {
  assertCan(actor, "users.manage");
  return prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
  });
}
