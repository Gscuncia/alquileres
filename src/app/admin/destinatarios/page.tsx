import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import {
  createRecipient,
  updateRecipient,
  deleteRecipient,
} from "@/app/admin/recipients/actions";
import { RecipientForm } from "@/components/admin/RecipientForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

interface DestinatariosPageProps {
  searchParams?: { destinatario?: string; error?: string };
}

const tableCellClasses = "border-b border-hairline px-4 py-3 text-body-sm text-body";

export default async function DestinatariosPage({
  searchParams,
}: DestinatariosPageProps) {
  await requireAdmin();

  const [recipients, editingRecipient] = await Promise.all([
    prisma.transferRecipient.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { bookings: true } } },
    }),
    searchParams?.destinatario
      ? prisma.transferRecipient.findUnique({
          where: { id: searchParams.destinatario },
        })
      : Promise.resolve(null),
  ]);

  const deleteBlocked = searchParams?.error === "reservas";
  const editing = editingRecipient ?? null;

  return (
    <div className="space-y-6">
      <h2 className="text-display-sm font-semibold text-ink">Destinatarios</h2>

      {deleteBlocked && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          No se puede eliminar: el destinatario tiene reservas asociadas.
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md font-semibold text-ink">
            {editing ? "Editar destinatario" : "Nuevo destinatario"}
          </h3>
          {editing && (
            <Link
              href="/admin/destinatarios"
              className="text-button-sm text-muted underline-offset-2 hover:underline"
            >
              Cancelar edición
            </Link>
          )}
        </div>
        <RecipientForm
          action={editing ? updateRecipient : createRecipient}
          initialValues={editing ? { id: editing.id, name: editing.name } : undefined}
          submitLabel={editing ? "Guardar cambios" : "Crear destinatario"}
        />
      </div>

      {recipients.length === 0 ? (
        <div className="rounded-md border border-hairline bg-surface-soft p-6 text-body-md text-body">
          Todavía no hay destinatarios cargados.
        </div>
      ) : (
        <table className="w-full rounded-md border border-hairline bg-canvas">
          <thead>
            <tr className="bg-surface-soft text-left">
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Nombre</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Reservas asociadas</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((recipient) => (
              <tr key={recipient.id}>
                <td className={`${tableCellClasses} text-ink`}>{recipient.name}</td>
                <td className={tableCellClasses}>{recipient._count.bookings}</td>
                <td className={tableCellClasses}>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/destinatarios?destinatario=${recipient.id}`}
                      className="text-button-sm text-ink underline-offset-2 hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={deleteRecipient}>
                      <input type="hidden" name="id" value={recipient.id} />
                      <ConfirmButton />
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
