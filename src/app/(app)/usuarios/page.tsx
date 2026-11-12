import { requireUser } from "@/lib/auth/current";
import { listUsers } from "@/domain/users";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { createUserAction, resetPasswordAction, toggleUserAction } from "./actions";

const ROLE_LABEL = { ADMIN: "Admin", TALLER: "Taller", DALMATA: "Dalmata" } as const;

export default async function UsersPage() {
  const actor = await requireUser();
  const users = await listUsers(actor);
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Usuarios</h1>

      <section className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="border rounded-md p-3 flex flex-wrap gap-3 items-end">
            <div className="min-w-40">
              <div className="font-medium">{u.name}</div>
              <div className="text-sm text-muted-foreground">
                {u.username} · {ROLE_LABEL[u.role]} · {u.active ? "Activo" : "Inactivo"}
              </div>
            </div>
            <ActionForm action={toggleUserAction}>
              <input type="hidden" name="userId" value={u.id} />
              <input type="hidden" name="active" value={String(!u.active)} />
              <Button variant="outline" size="sm" type="submit">
                {u.active ? "Desactivar" : "Activar"}
              </Button>
            </ActionForm>
            <ActionForm action={resetPasswordAction} className="flex gap-2 items-end">
              <input type="hidden" name="userId" value={u.id} />
              <Input name="password" type="password" placeholder="Nueva contraseña" className="w-44" required />
              <Button variant="outline" size="sm" type="submit">
                Resetear
              </Button>
            </ActionForm>
          </div>
        ))}
      </section>

      <section className="max-w-md space-y-3">
        <h2 className="font-semibold">Nuevo usuario</h2>
        <ActionForm action={createUserAction} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="username">Usuario</Label>
            <Input id="username" name="username" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Perfil</Label>
            <NativeSelect id="role" name="role" defaultValue="DALMATA">
              <option value="DALMATA">Dalmata</option>
              <option value="TALLER">Taller</option>
              <option value="ADMIN">Admin</option>
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Contraseña (mínimo 8)</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit">Crear usuario</Button>
        </ActionForm>
      </section>
    </div>
  );
}
