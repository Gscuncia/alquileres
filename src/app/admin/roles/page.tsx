import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-auth";
import { createRole, updateRole } from "@/app/admin/roles/actions";
import { RoleForm } from "@/components/admin/RoleForm";
import {
  AdminPanel,
  AdminEmptyState,
  AdminPageHeader,
} from "@/components/admin/primitives";
import { Button } from "@/components/design-system";

interface RolesPageProps {
  searchParams?: { rol?: string; error?: string };
}

const TAB_OPTIONS = [
  { id: "panel", label: "Panel" },
  { id: "calendario", label: "Calendario" },
  { id: "propiedades", label: "Propiedades" },
  { id: "reservas", label: "Reservas" },
  { id: "huespedes", label: "Huéspedes" },
  { id: "destinatarios", label: "Destinatarios" },
  { id: "gastos", label: "Gastos" },
] as const;

const tableCellClasses = "border-b border-hairline px-4 py-3 text-body-sm text-body";

export default async function RolesPage({ searchParams }: RolesPageProps) {
  await requirePermission("roles");

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
  });

  const editingRole = searchParams?.rol
    ? roles.find((role) => role.id === searchParams?.rol) ?? null
    : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Roles" />

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
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold text-ink">
              {editingRole ? "Editar rol" : "Nuevo rol"}
            </h3>
            {editingRole && (
              <Button asChild variant="tertiary">
                <Link href="/admin/roles">Cancelar edición</Link>
              </Button>
            )}
          </div>
          <RoleForm
            action={editingRole ? updateRole : createRole}
            initialValues={
              editingRole
                ? {
                    id: editingRole.id,
                    name: editingRole.name,
                    allowedTabs: editingRole.allowedTabs,
                  }
                : undefined
            }
            submitLabel={editingRole ? "Guardar cambios" : "Crear rol"}
          />
        </div>
      </AdminPanel>

      {roles.length === 0 ? (
        <AdminEmptyState>
          Todavía no hay roles cargados.
        </AdminEmptyState>
      ) : (
        <AdminPanel>
          <table className="w-full">
            <thead>
              <tr className="bg-surface-soft text-left">
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Nombre</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Pestañas permitidas</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className={`${tableCellClasses} text-ink`}>{role.name}</td>
                  <td className={tableCellClasses}>
                    {role.allowedTabs.length === 0
                      ? "Sin acceso"
                      : role.allowedTabs
                          .map(
                            (tab) =>
                              TAB_OPTIONS.find((option) => option.id === tab)?.label ?? tab,
                          )
                          .join(", ")}
                  </td>
                  <td className={tableCellClasses}>
                    <Button asChild variant="tertiary">
                      <Link href={`/admin/roles?rol=${role.id}`}>Editar</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminPanel>
      )}
    </div>
  );
}
