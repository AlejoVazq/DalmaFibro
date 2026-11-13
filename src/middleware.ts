import { NextResponse, type NextRequest } from "next/server";

/**
 * Origen público del pedido. Detrás del proxy (Caddy), `req.url` trae la dirección interna
 * (localhost:3003); el Host y X-Forwarded-Proto que manda el proxy traen el dominio real.
 */
function publicOrigin(req: NextRequest): string {
  const host = req.headers.get("host");
  if (!host) return new URL(req.url).origin;
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function middleware(req: NextRequest) {
  if (req.cookies.get("session") === undefined) {
    return NextResponse.redirect(new URL("/login", publicOrigin(req)));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
