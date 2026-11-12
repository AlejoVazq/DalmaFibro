"use server";

import { DomainError } from "@/lib/errors";
import { messageFor } from "@/lib/messages";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { login, logout, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/session";
import { str, type ActionState } from "@/lib/action";

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let res: Awaited<ReturnType<typeof login>>;
  try {
    res = await login(str(fd, "username"), str(fd, "password"));
  } catch (e) {
    if (e instanceof DomainError) return { error: messageFor(e.code) };
    throw e;
  }
  if (!res) return { error: "Usuario o contraseña incorrectos" };
  (await cookies()).set(SESSION_COOKIE, res.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  redirect("/");
}

export async function logoutAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await logout(token);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
