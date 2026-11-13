import { ChevronRight, KeyRound, UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth/current";
import { listUsers } from "@/domain/users";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { createUserAction, resetPasswordAction, toggleUserAction } from "./actions";

const ROLE_LABEL = { ADMIN: "Admin", TALLER: "Taller", DALMATA: "Dalmata" } as const;
const ROLE_HINT = {
  DALMATA: "Carga pedidos, ve stock y comprobantes.",
  TALLER: "Stock, producción, entregas, precios y comprobantes.",
  ADMIN: "Todo, incluso usuarios y anulaciones.",
} as const;

export default async function UsersPage() {
  const actor = await requireUser();
  const users = await listUsers(actor);
  return (
    <div className="space-y-8">
      <PageHeader title="Usuarios" description="Quién puede entrar a la app y qué puede hacer." />

      <ul className="grid gap-3 lg:grid-cols-2">
        {users.map((u) => (
          <li key={u.id} className={`space-y-3 rounded-xl border bg-card p-4 ${u.active ? "" : "opacity-70"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{u.name}</div>
                <div className="text-sm text-muted-foreground">Usuario: {u.username}</div>
              </div>
              <div className="flex gap-1.5">
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-medium text-accent-foreground">{ROLE_LABEL[u.role]}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${u.active ? "bg-success/12 text-success" : "bg-muted text-muted-foreground"}`}
                >
                  {u.active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionForm action={toggleUserAction} className="contents">
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="active" value={String(!u.active)} />
                {u.active ? (
                  <ConfirmSubmit
                    label="Desactivar"
                    question={`¿Desactivar a ${u.name}? No va a poder entrar hasta que lo actives de nuevo.`}
                    confirmLabel="Sí, desactivar"
                  />
                ) : (
                  <SubmitButton variant="outline">Activar</SubmitButton>
                )}
              </ActionForm>
            </div>
            <details className="group rounded-lg border">
              <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <KeyRound className="size-4" aria-hidden /> Cambiar contraseña
                <ChevronRight className="ml-auto size-4 transition-transform group-open:rotate-90" aria-hidden />
              </summary>
              <ActionForm action={resetPasswordAction} className="flex flex-wrap items-end gap-2 border-t p-3">
                <input type="hidden" name="userId" value={u.id} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor={`pw_${u.id}`}>Nueva contraseña (mínimo 8)</Label>
                  <Input id={`pw_${u.id}`} name="password" type="password" autoComplete="new-password" required />
                </div>
                <SubmitButton variant="secondary">Guardar</SubmitButton>
              </ActionForm>
            </details>
          </li>
        ))}
      </ul>

      <section className="max-w-md space-y-4 rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserPlus className="size-5 text-primary" aria-hidden /> Nuevo usuario
        </h2>
        <ActionForm action={createUserAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required placeholder="Ej.: Juan Pérez" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Usuario (para entrar)</Label>
            <Input id="username" name="username" required autoCapitalize="none" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Perfil</Label>
            <NativeSelect id="role" name="role" defaultValue="DALMATA">
              {(["DALMATA", "TALLER", "ADMIN"] as const).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]} — {ROLE_HINT[r]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña (mínimo 8)</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required />
          </div>
          <SubmitButton className="w-full sm:w-auto">Crear usuario</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
