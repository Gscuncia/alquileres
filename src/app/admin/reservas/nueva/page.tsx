import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { toDateStr } from "@/lib/datetime";
import { BookingForm } from "@/components/admin/BookingForm";
import { AdminPanel } from "@/components/admin/primitives";
import { Button } from "@/components/design-system";
import { createBooking } from "@/app/admin/bookings/actions";

export default async function NuevaReservaPage() {
  await requireAdmin();

  const [properties, recipients, guests, bookingRows] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-6">
      <Button asChild variant="tertiary" className="px-0">
        <Link href="/admin/reservas">← Volver a reservas</Link>
      </Button>

      <AdminPanel title="Nueva reserva">
        <BookingForm
          action={createBooking}
          initialValues={{
            checkInDate: toDateStr(new Date()),
            checkInTime: "12:00",
            checkOutTime: "10:00",
          }}
          guests={guests.map(({ id, firstName, lastName, dni, phone }) => ({
            id,
            firstName,
            lastName,
            dni,
            phone,
          }))}
          recipients={recipients.map(({ id, name }) => ({ id, name }))}
          properties={properties.map(({ id, title }) => ({ id, title }))}
          bookings={bookingRows.map(({ id, propertyId, checkIn, checkOut, guest }) => ({
            id,
            propertyId,
            guestName: `${guest.firstName} ${guest.lastName}`,
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString(),
          }))}
          submitLabel="Crear reserva"
        />
      </AdminPanel>
    </div>
  );
}
