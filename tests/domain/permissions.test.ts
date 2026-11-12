import type { Role } from "@prisma/client";
import { can, assertCan, type Action } from "@/lib/auth/permissions";
import { ForbiddenError } from "@/lib/errors";

const u = (role: Role) => ({ id: "x", name: "x", role });

test.each<[Role, Action, boolean]>([
  ["DALMATA", "invoices.create", false],
  ["DALMATA", "stock.move", false],
  ["DALMATA", "deliveries.create", false],
  ["DALMATA", "export.excel", false],
  ["DALMATA", "orders.create", true],
  ["DALMATA", "stock.registerArrival", true],
  ["TALLER", "prices.edit", true],
  ["TALLER", "users.manage", false],
  ["TALLER", "records.annul", false],
  ["ADMIN", "records.annul", true],
])("%s %s -> %s", (role, action, expected) => {
  expect(can(u(role), action)).toBe(expected);
});

test("assertCan lanza ForbiddenError", () => {
  expect(() => assertCan(u("DALMATA"), "invoices.create")).toThrow(ForbiddenError);
});
