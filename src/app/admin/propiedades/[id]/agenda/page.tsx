import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { toDateStr, toTimeStr, toUtc } from "@/lib/datetime";
import { BookingCalendar, type CalendarBooking } from "@/components/admin/BookingCalendar";
import { BookingForm, type BookingFormValues } from "@/components/admin/BookingForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { createBooking, deleteBooking, updateBooking } from "@/app/admin/bookings/actions";

const VALID_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

interface AgendaPageProps {
  params: { id: string };
  searchParams?: { mes?: string; reserva?: string };
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
    firstName: string;
    lastName: string;
    dni: string;
    phone: string;
    email: string | null;
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
    firstName: booking.firstName,
    lastName: booking.lastName,
    dni: booking.dni,
    phone: booking.phone,
    email: booking.email ?? "",
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
    select: { id: true, title: true },
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

  const [bookings, editingBooking, recipients] = await Promise.all([
    prisma.booking.findMany({
      where: {
        propertyId: property.id,
        checkIn: { lt: end },
        checkOut: { gt: start },
      },
      orderBy: { checkIn: "asc" },
    }),
    searchParams?.reserva
      ? prisma.booking.findUnique({
          where: { id: searchParams.reserva },
        })
      : Promise.resolve(null),
    prisma.transferRecipient.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Only a booking of this property may be edited here.
  const editing = editingBooking?.propertyId === property.id ? editingBooking : null;

  const calendarBookings: CalendarBooking[] = bookings;
  const currentPath = `${basePath}${monthParam}`;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/propiedades"
          className="text-button-sm text-ink underline-offset-2 hover:underline"
        >
          ← Volver a propiedades
        </Link>
        <h2 className="mt-2 text-display-sm font-semibold text-ink">
          Agenda: {property.title}
        </h2>
      </div>

      <BookingCalendar
        month={month}
        bookings={calendarBookings}
        navBasePath={basePath}
        bookingHref={(bookingId) => `${basePath}${monthParam}&reserva=${bookingId}`}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md font-semibold text-ink">
            {editing ? "Editar reserva" : "Nueva reserva"}
          </h3>
          {editing && (
            <Link
              href={currentPath}
              className="text-button-sm text-muted underline-offset-2 hover:underline"
            >
              Cancelar edición
            </Link>
          )}
        </div>
        <BookingForm
          action={editing ? updateBooking : createBooking}
          initialValues={editing ? toFormValues(editing, property.id) : undefined}
          recipients={recipients.map(({ id, name }) => ({ id, name }))}
          submitLabel={editing ? "Guardar cambios" : "Crear reserva"}
        />
      </div>

      {bookings.length > 0 && (
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
                  {booking.firstName} {booking.lastName} · ${Number(booking.pricePerNight)}/noche
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
      )}
    </div>
  );
}
