import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { toDateStr, toTimeStr, toUtc } from "@/lib/datetime";
import {
  CalendarGrid,
  type CalendarEvent,
} from "@/components/admin/CalendarGrid";
import { BookingForm, type BookingFormValues } from "@/components/admin/BookingForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { AdminPanel, AdminPageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/design-system";
import { createBooking, deleteBooking, updateBooking } from "@/app/admin/bookings/actions";

const VALID_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface AgendaPageProps {
  params: { id: string };
  searchParams?: { mes?: string; reserva?: string; fecha?: string };
}

function monthBounds(month: string): { start: Date; end: Date } {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const firstNextMonth = new Date(year, monthIndex + 1, 1);
  return {
    start: toUtc(`${month}-01`, "00:00"),
    end: toUtc(
      `${firstNextMonth.getFullYear()}-${String(
        firstNextMonth.getMonth() + 1,
      ).padStart(2, "0")}-01`,
      "00:00",
    ),
  };
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
    paymentType: "EFECTIVO" | "TRANSFERENCIA";
    paymentMethod: string | null;
    notes: string | null;
    transferRecipientId: string | null;
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
    paymentType: booking.paymentType,
    paymentMethod: booking.paymentMethod ?? "",
    notes: booking.notes ?? "",
    recipientId: booking.transferRecipientId ?? "",
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
  const month =
    searchParams?.mes && VALID_MONTH.test(searchParams.mes)
      ? searchParams.mes
      : toDateStr(new Date()).slice(0, 7);
  const { start, end } = monthBounds(month);
  const monthParam = `?mes=${month}`;

  const [bookings, editingBooking, recipients, guests] = await Promise.all([
    prisma.booking.findMany({
      where: {
        propertyId: property.id,
        checkIn: { lt: end },
        checkOut: { gt: start },
      },
      orderBy: { checkIn: "asc" },
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

  const calendarEvents: CalendarEvent[] = bookings.map((booking) => ({
    id: booking.id,
    guest: { firstName: booking.guest.firstName, lastName: booking.guest.lastName },
    property: { id: property.id, title: property.title },
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
  }));
  const currentPath = `${basePath}${monthParam}`;

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

      <CalendarGrid
        month={month}
        events={calendarEvents}
        properties={[{ id: property.id, title: property.title, color: property.color }]}
        mode="single"
        chipHref={(bookingId) => `${basePath}${monthParam}&reserva=${bookingId}`}
        dayHref={(dayStr) => `${basePath}?fecha=${dayStr}`}
        showMonthList
      />

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
              Reservas del mes
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
