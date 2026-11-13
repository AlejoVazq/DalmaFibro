import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LinkButton } from "@/components/link-button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <EmptyState
          icon={SearchX}
          title="No encontramos esta página"
          hint="Puede que el enlace esté mal o que el registro ya no exista."
          action={<LinkButton href="/">Ir al inicio</LinkButton>}
        />
      </div>
    </main>
  );
}
