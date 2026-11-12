import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { verifyPassword } from "./password";
import type { SessionUser } from "./permissions";

export const SESSION_COOKIE = "session";
export const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function login(
  username: string,
  password: string,
): Promise<{ token: string; user: SessionUser } | null> {
  const user = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (!user || !user.active) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      id: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000),
    },
  });
  return { token, user: { id: user.id, name: user.name, role: user.role } };
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const s = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!s || s.expiresAt < new Date() || !s.user.active) return null;
  return { id: s.user.id, name: s.user.name, role: s.user.role };
}

export async function logout(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}
