import { Package } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Package className="size-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gestión Dalmata</h1>
            <p className="text-sm text-muted-foreground">Ingresá con tu usuario y contraseña.</p>
          </div>
        </div>
        <ActionForm action={loginAction} className="space-y-4" resetOnSuccess={false}>
          <div className="space-y-1.5">
            <Label htmlFor="username">Usuario</Label>
            <Input id="username" name="username" autoComplete="username" autoCapitalize="none" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <SubmitButton size="lg" className="w-full" pendingLabel="Entrando…">
            Ingresar
          </SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
