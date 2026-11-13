"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

type Props = {
  /** Texto del botón inicial, p.ej. "Cancelar pedido". */
  label: string;
  /** Pregunta que se muestra al tocarlo. */
  question: string;
  /** Texto del botón que confirma, p.ej. "Sí, cancelar". */
  confirmLabel: string;
  /** "danger" para acciones que no se deshacen; "neutral" para el resto. */
  tone?: "danger" | "neutral";
  icon?: React.ReactNode;
  /** Campos extra que se piden al confirmar (p.ej. el motivo). */
  children?: React.ReactNode;
};

/** Confirmación dentro de la página (sin diálogos del navegador). Va dentro de un <form>. */
export function ConfirmSubmit({ label, question, confirmLabel, tone = "danger", icon, children }: Props) {
  const [asking, setAsking] = useState(false);
  const danger = tone === "danger";
  if (!asking) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setAsking(true)}
        className={danger ? "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined}
      >
        {icon}
        {label}
      </Button>
    );
  }
  return (
    <div className={`anim-in w-full space-y-3 rounded-lg border p-3 ${danger ? "border-destructive/30 bg-destructive/5" : "bg-muted"}`}>
      <p className="font-medium">{question}</p>
      {children}
      <div className="flex flex-wrap gap-2 *:flex-1 sm:*:flex-none">
        <SubmitButton variant={danger ? "destructive" : "default"}>{confirmLabel}</SubmitButton>
        <Button type="button" variant="outline" onClick={() => setAsking(false)}>
          No, volver
        </Button>
      </div>
    </div>
  );
}
