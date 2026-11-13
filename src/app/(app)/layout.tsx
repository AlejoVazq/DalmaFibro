import { requireUser } from "@/lib/auth/current";
import { Sidebar } from "@/components/app-shell/sidebar";
import { BottomBar } from "@/components/app-shell/bottom-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const shellUser = { id: user.id, name: user.name, role: user.role };
  return (
    <div className="flex min-h-screen">
      <Sidebar user={shellUser} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-5xl px-4 pt-5 pb-28 sm:px-6 md:pt-8 md:pb-10 print:p-0">{children}</main>
      </div>
      <BottomBar user={shellUser} />
    </div>
  );
}
