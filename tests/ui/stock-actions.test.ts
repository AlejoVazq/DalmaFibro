import { describe, expect, it } from "vitest";
import { stockActionsFor } from "@/app/(app)/stock/stock-actions";
import type { SessionUser } from "@/lib/auth/permissions";

const keys = (u: SessionUser) => stockActionsFor(u).map((a) => a.key);
const ALL = ["ingreso", "retiro", "uso", "descarte", "llegada", "ajuste"];

describe("stockActionsFor", () => {
  it("Dalmata solo registra llegada de placas", () => {
    expect(keys({ id: "d", name: "D", role: "DALMATA" })).toEqual(["llegada"]);
  });
  it("Taller y Admin ven todas, en orden de uso", () => {
    expect(keys({ id: "t", name: "T", role: "TALLER" })).toEqual(ALL);
    expect(keys({ id: "a", name: "A", role: "ADMIN" })).toEqual(ALL);
  });
  it("cada acción explica qué hace", () => {
    const ingreso = stockActionsFor({ id: "t", name: "T", role: "TALLER" })[0];
    expect(ingreso.title).toBe("Llegaron herrajes al taller");
    expect(ingreso.help).toBe("Sumá bisagras, cierres o tornillos que compraste.");
  });
});
