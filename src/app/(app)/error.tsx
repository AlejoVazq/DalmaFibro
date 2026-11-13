"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LinkButton } from "@/components/link-button";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Algo salió mal"
      hint="Puede que no tengas permiso para esta pantalla o que se haya cortado la conexión."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw aria-hidden /> Reintentar
          </Button>
          <LinkButton href="/">Ir al inicio</LinkButton>
        </div>
      }
    />
  );
}
