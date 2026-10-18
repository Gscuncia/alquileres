import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { toDateStr, toTimeStr } from "@/lib/datetime";
import { BookingForm, type BookingFormValues } from "@/components/admin/BookingForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { AdminPanel, AdminPageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/design-system";
import { createBooking, deleteBooking, updateBooking } from "@/app/admin/bookings/actions";

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface AgendaPageProps {
  params: { id: string };
  searchParams?: { reserva?: string; fecha?: string };
}

function toFormValues(
  booking: {
    id: string;
    guest: { id: string };
    checkIn: Date;
    checkOut: Date;
    /** Prisma Decimal arrives here; converted once at the boundary. */
    pricePerNight: unknown;
    depositAmount: unknown;
    depositPaymentType: "EFECTIVO" | "TRANSFERENCIA";
    depositPaymentMethod: string | null;
    depositTransferRecipientId: string | null;
    restPaymentType: "EFECTIVO" | "TRANSFERENCIA";
    restTransferRecipientId: string | null;
    notes: string | null;
  },
  propertyId: string,
): BookingFormValues {
  return {
    id: booking.id,
    propertyId,
    guestId: booking.guest.id,
    checkInDate: toDateStr(booking.checkIn),
    checkInTime: toTimeStr(booking.checkIn),
    checkOutDate: toDateStr(booking.checkOut),
    checkOutTime: toTimeStr(booking.checkOut),
    pricePerNight: String(Number(booking.pricePerNight)),
    depositAmount: String(Number(booking.depositAmount)),
    depositPaymentType: booking.depositPaymentType,
    depositPaymentMethod: booking.depositPaymentMethod ?? "",
    depositRecipientId: booking.depositTransferRecipientId ?? "",
    restPaymentType: booking.restPaymentType,
    restRecipientId: booking.restTransferRecipientId ?? "",
    notes: booking.notes ?? "",
  };
}

export default async function AgendaPage({ params, searchParams }: AgendaPageProps) {
  await requireAdmin();

  const property = await prisma.property.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, color: true },
  });
  if (!property) {
    notFound();
  }

  const basePath = `/admin/propiedades/${property.id}/agenda`;
  const currentPath = basePath;

  // The agenda lists every booking of the property; month filtering and the
  // monthly grid belong to the Calendario tab.
  const [bookings, editingBooking, recipients, guests] = await Promise.all([
    prisma.booking.findMany({
      where: { propertyId: property.id },
      orderBy: { checkIn: "desc" },
      include: { guest: true },
    }),
    searchParams?.reserva
      ? prisma.booking.findUnique({
          where: { id: searchParams.reserva },
          include: { guest: true },
        })
      : Promise.resolve(null),
    prisma.transferRecipient.findMany({ orderBy: { name: "asc" } }),
    prisma.guest.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  // Only a booking of this property may be edited here.
  const editing = editingBooking?.propertyId === property.id ? editingBooking : null;

  // Day-click prefill: `?fecha=YYYY-MM-DD` starts a create form on that day
  // with the default times; without it the form defaults to today.
  const fecha = VALID_DATE.test(searchParams?.fecha ?? "")
    ? (searchParams?.fecha as string)
    : "";
  const initialValues = editing
    ? toFormValues(editing, property.id)
    : { checkInDate: fecha || toDateStr(new Date()), checkInTime: "12:00", checkOutTime: "10:00" };

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="tertiary">
          <Link href="/admin/propiedades">← Volver a propiedades</Link>
        </Button>
        <h2 className="mt-2 text-display-sm font-semibold text-ink">
          Agenda: {property.title}
        </h2>
      </div>

      <AdminPanel>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold text-ink">
              {editing ? "Editar reserva" : "Nueva reserva"}
            </h3>
            {editing && (
              <Button asChild variant="tertiary">
                <Link href={currentPath}>Cancelar edición</Link>
              </Button>
            )}
          </div>
          <BookingForm
            action={editing ? updateBooking : createBooking}
            initialValues={initialValues}
            guests={guests.map(({ id, firstName, lastName, dni, phone }) => ({
              id,
              firstName,
              lastName,
              dni,
              phone,
            }))}
            recipients={recipients.map(({ id, name }) => ({ id, name }))}
            submitLabel={editing ? "Guardar cambios" : "Crear reserva"}
          />
        </div>
      </AdminPanel>

      {bookings.length > 0 && (
        <AdminPanel>
          <div className="space-y-3">
            <h3 className="text-title-md font-semibold text-ink">
              Reservas de la propiedad
            </h3>
            <ul className="divide-y divide-hairline rounded-md border border-hairline">
              {bookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <span className="text-body-sm text-body">
                    {booking.guest.firstName} {booking.guest.lastName} · ${Number(booking.pricePerNight)}/noche
                  </span>
                  <form action={deleteBooking}>
                    <input type="hidden" name="id" value={booking.id} />
                    <input type="hidden" name="redirectTo" value={currentPath} />
                    <ConfirmButton />
                  </form>
                </li>
              ))}
            </ul>
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
