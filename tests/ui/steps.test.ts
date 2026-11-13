import { describe, expect, it } from "vitest";
import { invoiceSteps, orderSteps } from "@/lib/steps";

const states = (s: { state: string }[] | null) => s?.map((x) => x.state);

describe("orderSteps", () => {
  it("recibido es el primer paso actual", () => {
    expect(states(orderSteps("RECIBIDO"))).toEqual(["current", "todo", "todo", "todo"]);
  });
  it("en producción completa recibido", () => {
    expect(states(orderSteps("EN_PRODUCCION"))).toEqual(["done", "current", "todo", "todo"]);
  });
  it("parcial queda en el último paso con su nombre", () => {
    const s = orderSteps("PARCIAL")!;
    expect(states(s)).toEqual(["done", "done", "done", "current"]);
    expect(s[3].label).toBe("Entregado parcialmente");
  });
  it("entregado completa todos", () => {
    expect(states(orderSteps("ENTREGADO"))).toEqual(["done", "done", "done", "done"]);
  });
  it("cancelado no tiene pasos", () => {
    expect(orderSteps("CANCELADO")).toBeNull();
  });
});

describe("invoiceSteps", () => {
  it("enviado completa emitido", () => {
    expect(states(invoiceSteps("ENVIADO"))).toEqual(["done", "current", "todo"]);
  });
  it("pagado completa todos", () => {
    expect(states(invoiceSteps("PAGADO"))).toEqual(["done", "done", "done"]);
  });
  it("anulado no tiene pasos", () => {
    expect(invoiceSteps("ANULADO")).toBeNull();
  });
});
