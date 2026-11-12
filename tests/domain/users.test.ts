import { createUser, setUserActive, resetPassword, listUsers } from "@/domain/users";
import { login } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/errors";
import { resetDb } from "../helpers/db";
import { makeUser } from "../helpers/factories";

beforeEach(resetDb);

test("TALLER no puede crear usuarios", async () => {
  const papa = await makeUser("TALLER");
  await expect(
    createUser(papa, { username: "x", name: "X", role: "DALMATA", password: "12345678" }),
  ).rejects.toBeInstanceOf(ForbiddenError);
});

test("username duplicado -> USERNAME_TAKEN", async () => {
  const admin = await makeUser("ADMIN");
  await createUser(admin, { username: "dal", name: "Dalmata", role: "DALMATA", password: "12345678" });
  await expect(
    createUser(admin, { username: "dal", name: "Otro", role: "DALMATA", password: "12345678" }),
  ).rejects.toMatchObject({ code: "USERNAME_TAKEN" });
});

test("contraseña corta -> PASSWORD_TOO_SHORT", async () => {
  const admin = await makeUser("ADMIN");
  await expect(
    createUser(admin, { username: "dal", name: "D", role: "DALMATA", password: "1234567" }),
  ).rejects.toMatchObject({ code: "PASSWORD_TOO_SHORT" });
});

test("admin no puede desactivarse a sí mismo", async () => {
  const admin = await makeUser("ADMIN");
  await expect(setUserActive(admin, admin.id, false)).rejects.toMatchObject({ code: "SELF_DEACTIVATE" });
});

test("desactivar invalida login; resetPassword cambia la clave", async () => {
  const admin = await makeUser("ADMIN");
  const u = await createUser(admin, { username: "dal", name: "D", role: "DALMATA", password: "vieja1234" });
  await resetPassword(admin, u.id, "nueva1234");
  expect(await login("dal", "vieja1234")).toBeNull();
  expect(await login("dal", "nueva1234")).not.toBeNull();
  await setUserActive(admin, u.id, false);
  expect(await login("dal", "nueva1234")).toBeNull();
  expect((await listUsers(admin)).find((x) => x.id === u.id)?.active).toBe(false);
});
