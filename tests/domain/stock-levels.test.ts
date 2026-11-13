import { stockLevel, LOW_STOCK_THRESHOLDS } from "@/domain/stock-levels";

test("umbrales pedidos: tornillos 2000/1000, bisagras 1500/1000, cierres 750/500", () => {
  expect(LOW_STOCK_THRESHOLDS).toEqual({
    TORNILLO: { bajo: 2000, critico: 1000 },
    BISAGRA: { bajo: 1500, critico: 1000 },
    CIERRE_A: { bajo: 750, critico: 500 },
    CIERRE_B: { bajo: 750, critico: 500 },
  });
});

test.each([
  ["TORNILLO", 2001, "ok"],
  ["TORNILLO", 2000, "bajo"],
  ["TORNILLO", 1001, "bajo"],
  ["TORNILLO", 1000, "critico"],
  ["TORNILLO", 0, "critico"],
  ["TORNILLO", -1, "falta"],
  ["BISAGRA", 1501, "ok"],
  ["BISAGRA", 1500, "bajo"],
  ["BISAGRA", 1000, "critico"],
  ["CIERRE_A", 751, "ok"],
  ["CIERRE_A", 750, "bajo"],
  ["CIERRE_B", 500, "critico"],
] as const)("%s con %i libres → %s", (code, available, level) => {
  expect(stockLevel(code, available)).toBe(level);
});

test("materiales sin umbral (placas) solo avisan si falta", () => {
  expect(stockLevel("PLACA_GRUESA", 3)).toBe("ok");
  expect(stockLevel("PLACA_GRUESA", -2)).toBe("falta");
});
