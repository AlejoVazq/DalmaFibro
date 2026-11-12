import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { verifyPassword } from "./password";
import type { SessionUser } from "./permissions";

export const SESSION_COOKIE = "session";
export const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Límite de intentos fallidos por usuario (en memoria: la app corre en una sola instancia).
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;
const failures = new Map<string, { count: number; first: number }>();

function attemptsKey(username: string) {
  return username.trim().toLowerCase();
}

function assertNotLocked(key: string) {
  const f = failures.get(key);
  if (!f) return;
  if (Date.now() - f.first > LOCK_MS) failures.delete(key);
  else if (f.count >= MAX_FAILURES) throw new DomainError("TOO_MANY_ATTEMPTS");
}

function recordFailure(key: string) {
  const f = failures.get(key);
  if (!f || Date.now() - f.first > LOCK_MS) failures.set(key, { count: 1, first: Date.now() });
  else f.count++;
}

export async function login(
  username: string,
  password: string,
): Promise<{ token: string; user: SessionUser } | null> {
  const key = attemptsKey(username);
  assertNotLocked(key);
  const user = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    recordFailure(key);
    return null;
  }
  failures.delete(key);
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
