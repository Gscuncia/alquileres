import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { normalizeForSearch } from "@/lib/search";
import {
  createGuest,
  deleteGuest,
  updateGuest,
} from "@/app/admin/guests/actions";
import { GuestForm } from "@/components/admin/GuestForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import {
  AdminPanel,
  AdminEmptyState,
  AdminPageHeader,
  AdminField,
  AdminInput,
} from "@/components/admin/primitives";
import { Button } from "@/components/design-system";

interface HuespedesPageProps {
  searchParams?: { q?: string; huesped?: string; error?: string };
}

const tableCellClasses = "border-b border-hairline px-4 py-3 text-body-sm text-body";

export default async function HuespedesPage({ searchParams }: HuespedesPageProps) {
  await requireAdmin();

  const q = searchParams?.q?.trim() ?? "";

  const [guests, editingGuest] = await Promise.all([
    prisma.guest.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { _count: { select: { bookings: true } } },
    }),
    searchParams?.huesped
      ? prisma.guest.findUnique({
          where: { id: searchParams.huesped },
        })
      : Promise.resolve(null),
  ]);

  // Accent- and case-insensitive search happens in TypeScript over the
  // already-fetched rows (tiny volumes; Postgres lacks a built-in unaccent).
  const filtered = q
    ? guests.filter((guest) =>
        [
          guest.firstName,
          guest.lastName,
          guest.dni,
          guest.phone,
        ].some((field) => normalizeForSearch(field).includes(normalizeForSearch(q))),
      )
    : guests;

  const deleteBlocked = searchParams?.error === "reservas";
  const editing = editingGuest ?? null;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Huéspedes" />

      {deleteBlocked && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          No se puede eliminar: el huésped tiene reservas asociadas.
        </div>
      )}

      <AdminPanel>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold text-ink">
              {editing ? "Editar huésped" : "Nuevo huésped"}
            </h3>
            {editing && (
              <Button asChild variant="tertiary">
                <Link href="/admin/huespedes">Cancelar edición</Link>
              </Button>
            )}
          </div>
          <GuestForm
            action={editing ? updateGuest : createGuest}
            initialValues={
              editing
                ? {
                    id: editing.id,
                    firstName: editing.firstName,
                    lastName: editing.lastName,
                    dni: editing.dni,
                    phone: editing.phone,
                    email: editing.email ?? "",
                    notes: editing.notes ?? "",
                  }
                : undefined
            }
            submitLabel={editing ? "Guardar cambios" : "Crear huésped"}
          />
        </div>
      </AdminPanel>

      <form method="get" action="/admin/huespedes" className="flex items-end gap-2">
        <div className="w-full max-w-sm">
          <AdminField label="Buscar huésped" htmlFor="q">
            <AdminInput
              id="q"
              name="q"
              type="text"
              placeholder="nombre / DNI / teléfono"
              defaultValue={q}
            />
          </AdminField>
        </div>
        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
        {q && (
          <Button asChild variant="tertiary">
            <Link href="/admin/huespedes">Limpiar</Link>
          </Button>
        )}
      </form>

      {filtered.length === 0 ? (
        <AdminEmptyState>
          {q
            ? "No hay huéspedes que coincidan con la búsqueda."
            : "Todavía no hay huéspedes cargados."}
        </AdminEmptyState>
      ) : (
        <AdminPanel>
          <table className="w-full">
            <thead>
              <tr className="bg-surface-soft text-left">
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Nombre</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">DNI</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Teléfono</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Email</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Reservas asociadas</th>
                <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((guest) => (
                <tr key={guest.id}>
                  <td className={`${tableCellClasses} text-ink`}>
                    {guest.firstName} {guest.lastName}
                  </td>
                  <td className={tableCellClasses}>{guest.dni}</td>
                  <td className={tableCellClasses}>{guest.phone}</td>
                  <td className={tableCellClasses}>{guest.email ?? ""}</td>
                  <td className={tableCellClasses}>{guest._count.bookings}</td>
                  <td className={tableCellClasses}>
                    <div className="flex items-center gap-3">
                      <Button asChild variant="tertiary">
                        <Link href={`/admin/huespedes?huesped=${guest.id}`}>
                          Editar
                        </Link>
                      </Button>
                      <form action={deleteGuest}>
                        <input type="hidden" name="id" value={guest.id} />
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
