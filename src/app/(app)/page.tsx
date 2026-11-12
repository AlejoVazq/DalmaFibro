import { requireUser } from "@/lib/auth/current";

export default async function HomePage() {
  const user = await requireUser();
  return <h1 className="text-xl font-semibold">Hola, {user.name}</h1>;
}
