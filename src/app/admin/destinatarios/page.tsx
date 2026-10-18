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
import {
  AdminPanel,
  AdminEmptyState,
  AdminPageHeader,
} from "@/components/admin/primitives";
import { Button } from "@/components/design-system";

interface DestinatariosPageProps {
  searchParams?: { destinatario?: string; error?: string };
}

const tableCellClasses = "border-b border-hairline px-4 py-3 text-body-sm text-body";

export default async function DestinatariosPage({
  searchParams,
}: DestinatariosPageProps) {
  await requireAdmin();

  const [recipientRows, editingRecipient] = await Promise.all([
    prisma.transferRecipient.findMany({
      orderBy: { name: "asc" },
      // A booking may reference the recipient in both payment parts; the
      // association count is the DISTINCT union of both relation sets.
      include: {
        depositBookings: { select: { id: true } },
        restBookings: { select: { id: true } },
      },
    }),
    searchParams?.destinatario
      ? prisma.transferRecipient.findUnique({
          where: { id: searchParams.destinatario },
        })
      : Promise.resolve(null),
  ]);

  const recipients = recipientRows.map(({ depositBookings, restBookings, ...recipient }) => ({
    ...recipient,
    bookingsCount:
      new Set([...depositBookings, ...restBookings].map((b) => b.id)).size,
  }));

  const deleteBlocked = searchParams?.error === "reservas";
  const editing = editingRecipient ?? null;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Destinatarios" />

      {deleteBlocked && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          No se puede eliminar: el destinatario tiene reservas asociadas.
        </div>
      )}

      <AdminPanel>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold text-ink">
              {editing ? "Editar destinatario" : "Nuevo destinatario"}
            </h3>
            {editing && (
              <Button asChild variant="tertiary">
                <Link href="/admin/destinatarios">Cancelar edición</Link>
              </Button>
            )}
          </div>
          <RecipientForm
            action={editing ? updateRecipient : createRecipient}
            initialValues={editing ? { id: editing.id, name: editing.name } : undefined}
            submitLabel={editing ? "Guardar cambios" : "Crear destinatario"}
          />
        </div>
      </AdminPanel>

      {recipients.length === 0 ? (
        <AdminEmptyState>
          Todavía no hay destinatarios cargados.
        </AdminEmptyState>
      ) : (
        <AdminPanel>
          <table className="w-full">
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
                  <td className={tableCellClasses}>{recipient.bookingsCount}</td>
                  <td className={tableCellClasses}>
                    <div className="flex items-center gap-3">
                      <Button asChild variant="tertiary">
                        <Link href={`/admin/destinatarios?destinatario=${recipient.id}`}>
                          Editar
                        </Link>
                      </Button>
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
        </AdminPanel>
      )}
    </div>
  );
}
