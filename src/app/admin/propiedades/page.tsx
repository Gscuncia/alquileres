import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { getAllPropertiesForAdmin } from "@/lib/properties-db";
import { deleteProperty } from "@/app/admin/properties/actions";
import { PropertyStateBadge } from "@/components/admin/Badge";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Button } from "@/components/design-system";

interface AdminPropertiesPageProps {
  searchParams?: { error?: string };
}

const tableCellClasses = "border-b border-hairline px-4 py-3 text-body-sm text-body";

export default async function AdminPropertiesPage({
  searchParams,
}: AdminPropertiesPageProps) {
  await requireAdmin();
  const properties = await getAllPropertiesForAdmin();
  const deleteBlocked = searchParams?.error === "eliminar";
  const deletePublishedBlocked = searchParams?.error === "publicada";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-display-sm font-semibold text-ink">Propiedades</h2>
        <Button asChild variant="primary">
          <Link href="/admin/propiedades/nueva">Nueva propiedad</Link>
        </Button>
      </div>

      {deleteBlocked && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          No se puede eliminar la propiedad porque tiene reservas asociadas.
          Eliminá primero sus reservas.
        </div>
      )}

      {deletePublishedBlocked && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          No se puede eliminar una propiedad publicada. Despublicala primero
          desde el editor (destildá "Publicada") y volvé a intentar.
        </div>
      )}

      {properties.length === 0 ? (
        <div className="rounded-md border border-hairline bg-surface-soft p-6 text-body-md text-body">
          Todavía no hay propiedades cargadas.
        </div>
      ) : (
        <table className="w-full rounded-md border border-hairline bg-canvas">
          <thead>
            <tr className="bg-surface-soft text-left">
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Orden</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Título</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Color</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Slug</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Capacidad</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Estado</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id}>
                <td className={tableCellClasses}>{property.sortOrder}</td>
                <td className={`${tableCellClasses} text-ink`}>{property.title}</td>
                <td className={tableCellClasses}>
                  {property.color ? (
                    <span
                      title={property.color}
                      aria-label={`Color ${property.color}`}
                      className="inline-block h-4 w-4 rounded-full border border-hairline"
                      style={{ backgroundColor: property.color }}
                    />
                  ) : (
                    <span
                      title="Color automático del calendario"
                      className="inline-block h-4 w-4 rounded-full border border-hairline bg-surface-soft"
                    />
                  )}
                </td>
                <td className={tableCellClasses}>{property.slug}</td>
                <td className={tableCellClasses}>{property.capacity}</td>
                <td className={tableCellClasses}>
                  <PropertyStateBadge published={property.published} />
                </td>
                <td className={tableCellClasses}>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/propiedades/${property.id}`}
                      className="text-button-sm text-ink underline-offset-2 hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={deleteProperty}>
                      <input type="hidden" name="id" value={property.id} />
                      <span
                        title={
                          property.published
                            ? "Despublicá la propiedad antes de eliminarla"
                            : "Eliminar propiedad"
                        }
                      >
                        <ConfirmButton />
                      </span>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
