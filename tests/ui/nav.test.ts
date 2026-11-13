import { describe, expect, it } from "vitest";
import { bottomBarItems, isActive, moreItems } from "@/lib/nav";
import type { SessionUser } from "@/lib/auth/permissions";

const dalmata: SessionUser = { id: "d", name: "D", role: "DALMATA" };
const taller: SessionUser = { id: "t", name: "T", role: "TALLER" };
const admin: SessionUser = { id: "a", name: "A", role: "ADMIN" };
const labels = (xs: { label: string }[]) => xs.map((x) => x.label);

describe("nav", () => {
  it("la barra inferior de Dalmata tiene las 4 secciones y Más", () => {
    expect(labels(bottomBarItems(dalmata))).toEqual(["Inicio", "Pedidos", "Stock", "Comprobantes", "Más"]);
  });

  it("Más lista solo lo que cada perfil puede usar", () => {
    expect(moreItems(dalmata)).toEqual([]);
    expect(labels(moreItems(taller))).toEqual(["Catálogo"]);
    expect(labels(moreItems(admin))).toEqual(["Catálogo", "Usuarios"]);
  });

  it("marca la sección activa por prefijo de ruta", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/pedidos", "/")).toBe(false);
    expect(isActive("/pedidos/abc/entregar", "/pedidos")).toBe(true);
    expect(isActive("/pedidosx", "/pedidos")).toBe(false);
  });

  it("Más queda activo en las secciones que agrupa", () => {
    expect(isActive("/catalogo/1", "/mas", admin)).toBe(true);
    expect(isActive("/mas", "/mas", dalmata)).toBe(true);
    expect(isActive("/pedidos", "/mas", admin)).toBe(false);
  });
});
