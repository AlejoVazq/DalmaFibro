import { prisma } from "@/lib/db";
import { login, getSessionUser, logout } from "@/lib/auth/session";
import { resetDb } from "../helpers/db";
import { makeUser } from "../helpers/factories";

beforeEach(resetDb);

test("login correcto, incorrecto e inactivo", async () => {
  await makeUser("TALLER", { username: "papa", password: "secreta123" });
  expect(await login("papa", "mala")).toBeNull();
  const s = await login("papa", "secreta123");
  expect((await getSessionUser(s!.token))?.role).toBe("TALLER");
  await prisma.user.update({ where: { username: "papa" }, data: { active: false } });
  expect(await login("papa", "secreta123")).toBeNull();
  expect(await getSessionUser(s!.token)).toBeNull();
});

test("el token no se guarda en claro y logout invalida", async () => {
  await makeUser("ADMIN", { username: "alejo", password: "secreta123" });
  const s = await login("alejo", "secreta123");
  expect(await prisma.session.findUnique({ where: { id: s!.token } })).toBeNull();
  await logout(s!.token);
  expect(await getSessionUser(s!.token)).toBeNull();
});

test("tras 5 intentos fallidos el usuario queda bloqueado 15 minutos, aun con la clave correcta", async () => {
  await makeUser("DALMATA", { username: "victima", password: "correcta123" });
  for (let i = 0; i < 5; i++) expect(await login("victima", `mala${i}`)).toBeNull();
  await expect(login("victima", "correcta123")).rejects.toMatchObject({ code: "TOO_MANY_ATTEMPTS" });
  await expect(login("VICTIMA ", "correcta123")).rejects.toMatchObject({ code: "TOO_MANY_ATTEMPTS" });
});

test("un login correcto reinicia el contador de fallos", async () => {
  await makeUser("DALMATA", { username: "olvidadizo", password: "correcta123" });
  for (let i = 0; i < 4; i++) await login("olvidadizo", "mala");
  expect(await login("olvidadizo", "correcta123")).not.toBeNull();
  for (let i = 0; i < 4; i++) await login("olvidadizo", "mala");
  expect(await login("olvidadizo", "correcta123")).not.toBeNull();
});
