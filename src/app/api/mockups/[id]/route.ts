import { currentUser } from "@/lib/auth/current";
import { readMockup } from "@/domain/mockups";
import { DomainError, ForbiddenError } from "@/lib/errors";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  try {
    const m = await readMockup(user, id);
    return new Response(new Uint8Array(m.data), {
      headers: {
        "Content-Type": m.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(m.filename)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return new Response("Prohibido", { status: 403 });
    if (e instanceof DomainError) return new Response("No encontrado", { status: 404 });
    throw e;
  }
}
