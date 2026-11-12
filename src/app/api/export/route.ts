import { currentUser } from "@/lib/auth/current";
import { buildAccountingWorkbook } from "@/domain/export";
import { ForbiddenError } from "@/lib/errors";
import { dayStart, isoDay } from "@/lib/format";

/** GET /api/export?from=YYYY-MM-DD&to=YYYY-MM-DD — sin fechas: desde el 1° del mes actual hasta hoy. */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const url = new URL(req.url);
  const today = isoDay(new Date());
  const to = dayStart(url.searchParams.get("to") ?? undefined) ? url.searchParams.get("to")! : today;
  const from = dayStart(url.searchParams.get("from") ?? undefined) ? url.searchParams.get("from")! : `${today.slice(0, 8)}01`;
  if (from > to) return new Response("La fecha 'desde' es posterior a 'hasta'", { status: 400 });
  try {
    const buf = await buildAccountingWorkbook(user, { from: dayStart(from)!, to: dayStart(to)! });
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="dalmata-contabilidad-${from}-a-${to}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return new Response("Prohibido", { status: 403 });
    throw e;
  }
}
