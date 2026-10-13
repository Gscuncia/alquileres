import Link from "next/link";
import { requirePermission } from "@/lib/require-auth";
import { AdminPanel } from "@/components/admin/primitives";
import { AdminChangePasswordForm } from "@/components/admin/AdminChangePasswordForm";

interface ChangePasswordPageProps {
  searchParams?: { message?: string };
}

export default async function CambiarContrasenaPage({
  searchParams,
}: ChangePasswordPageProps) {
  await requirePermission();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-display-sm font-semibold text-ink">
          Cambiar contraseña
        </h1>
        <Link
          href="/admin"
          className="text-button-sm text-ink underline-offset-2 hover:underline"
        >
          Volver al panel
        </Link>
      </div>

      {searchParams?.message === "contrasena-actualizada" && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-ink"
        >
          Tu contraseña se actualizó correctamente.
        </div>
      )}

      <AdminPanel>
        <AdminChangePasswordForm />
      </AdminPanel>
    </div>
  );
}
