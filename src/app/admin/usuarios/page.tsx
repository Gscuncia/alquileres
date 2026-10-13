import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-auth";
import { createUser } from "@/app/admin/usuarios/actions";
import { UserForm } from "@/components/admin/UserForm";
import {
  AdminPanel,
  AdminEmptyState,
  AdminPageHeader,
} from "@/components/admin/primitives";

interface UsuariosPageProps {
  searchParams?: { error?: string };
}

const tableCellClasses = "border-b border-hairline px-4 py-3 text-body-sm text-body";

function formatName(user: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
}): string {
  if (user.firstName || user.lastName) {
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  }
  return user.name ?? "—";
}

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  await requirePermission("usuarios");

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { role: true },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Usuarios" />

      {searchParams?.error === "no-autorizado" && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          No tenés permisos para realizar esa acción.
        </div>
      )}

      <AdminPanel>
        <div className="space-y-4">
          <h3 className="text-title-md font-semibold text-ink">
            Nuevo usuario
          </h3>
          <UserForm action={createUser} roles={roles} />
        </div>
      </AdminPanel>

      {users.length === 0 ? (
        <AdminEmptyState>
          Todavía no hay usuarios cargados.
        </AdminEmptyState>
      ) : (
        <AdminPanel>
          <table className="w-full">
            <thead>
              <tr className="bg-surface-soft text-left">
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Email</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Nombre</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className={`${tableCellClasses} text-ink`}>{user.email}</td>
                  <td className={tableCellClasses}>{formatName(user)}</td>
                  <td className={tableCellClasses}>{user.role.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminPanel>
      )}
    </div>
  );
}
