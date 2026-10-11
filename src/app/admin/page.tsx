import { auth } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <h2 className="text-display-sm font-semibold text-ink">
        Panel de administración
      </h2>
      <div className="rounded-md border border-hairline bg-surface-soft p-6">
        <p className="text-body-md text-body">
          Bienvenido, {session?.user?.email}.
        </p>
        <p className="mt-2 text-caption-sm text-muted">
          Rol: {session?.user?.role}
        </p>
      </div>
    </div>
  );
}
