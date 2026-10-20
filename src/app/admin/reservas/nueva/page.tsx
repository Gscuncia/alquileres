import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { toDateStr } from "@/lib/datetime";
import { bookingToFormValues } from "@/lib/booking-form-values";
import { BookingForm } from "@/components/admin/BookingForm";
import { AdminPanel } from "@/components/admin/primitives";
import { Button } from "@/components/design-system";
import { createBooking, updateBooking } from "@/app/admin/bookings/actions";

interface NuevaReservaPageProps {
  searchParams?: { reserva?: string };
}

export default async function NuevaReservaPage({
  searchParams,
}: NuevaReservaPageProps) {
  await requireAdmin();

  const reservaId = searchParams?.reserva?.trim() ?? "";

  const [properties, recipients, guests, bookingRows, editingBooking] =
    await Promise.all([
      prisma.property.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.transferRecipient.findMany({ orderBy: { name: "asc" } }),
      prisma.guest.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      // Existing stays feed the live availability alert in the form.
      prisma.booking.findMany({
        select: {
          id: true,
          propertyId: true,
          checkIn: true,
          checkOut: true,
          guest: { select: { firstName: true, lastName: true } },
        },
        orderBy: { checkIn: "asc" },
      }),
      // Edit mode: `?reserva=<id>` loads the booking to modify.
      reservaId
        ? prisma.booking.findUnique({
            where: { id: reservaId },
            include: { guest: true },
          })
        : Promise.resolve(null),
    ]);

  const editing = editingBooking ?? null;

  return (
    <div className="space-y-6">
      <Button asChild variant="tertiary" className="px-0">
        <Link href="/admin/reservas">← Volver a reservas</Link>
      </Button>

      <AdminPanel title={editing ? "Editar reserva" : "Nueva reserva"}>
        <div className="space-y-4">
          {editing && (
            <div className="flex items-center justify-end">
              <Button asChild variant="tertiary">
                <Link href="/admin/reservas/nueva">Cancelar edición</Link>
              </Button>
            </div>
          )}
          <BookingForm
            action={editing ? updateBooking : createBooking}
            initialValues={
              editing
                ? bookingToFormValues(editing, editing.propertyId)
                : {
                    checkInDate: toDateStr(new Date()),
                    checkInTime: "12:00",
                    checkOutTime: "10:00",
                  }
            }
            guests={guests.map(({ id, firstName, lastName, dni, phone }) => ({
              id,
              firstName,
              lastName,
              dni,
              phone,
            }))}
            recipients={recipients.map(({ id, name }) => ({ id, name }))}
            properties={properties.map(({ id, title }) => ({ id, title }))}
            bookings={bookingRows.map(
              ({ id, propertyId, checkIn, checkOut, guest }) => ({
                id,
                propertyId,
                guestName: `${guest.firstName} ${guest.lastName}`,
                checkIn: checkIn.toISOString(),
                checkOut: checkOut.toISOString(),
              }),
            )}
            submitLabel={editing ? "Guardar cambios" : "Crear reserva"}
          />
        </div>
      </AdminPanel>
    </div>
  );
}
