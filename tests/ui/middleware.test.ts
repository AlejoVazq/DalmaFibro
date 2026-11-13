import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

test("sin sesión redirige a /login del dominio público, no al puerto interno", () => {
  const req = new NextRequest("http://localhost:3003/pedidos", {
    headers: { host: "vaztech.com.ar", "x-forwarded-proto": "https" },
  });
  expect(middleware(req).headers.get("location")).toBe("https://vaztech.com.ar/login");
});

test("en desarrollo, sin proxy, sigue usando la URL del pedido", () => {
  const req = new NextRequest("http://localhost:3100/pedidos", { headers: { host: "localhost:3100" } });
  expect(middleware(req).headers.get("location")).toBe("http://localhost:3100/login");
});

test("con sesión deja pasar", () => {
  const req = new NextRequest("http://localhost:3003/", { headers: { cookie: "session=abc" } });
  expect(middleware(req).headers.get("location")).toBeNull();
});
