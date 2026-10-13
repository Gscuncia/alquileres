import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getAllPropertiesForAdmin } from "@/lib/properties-db";
import { formatInTz, toDateStr, toTimeStr, toUtc } from "@/lib/datetime";
import {
  CalendarGrid,
  DayDetailList,
  type CalendarEvent,
} from "@/components/admin/CalendarGrid";
import { BookingForm } from "@/components/admin/BookingForm";
import { createBooking, updateBooking } from "@/app/admin/bookings/actions";
import {
  AdminPageHeader,
  AdminField,
  AdminInput,
} from "@/components/admin/primitives";
import { Button } from "@/components/design-system";

const VALID_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface CalendarioPageProps {
  searchParams?: {
    mes?: string;
    propiedad?: string;
    nueva?: string;
    fecha?: string;
    dia?: string;
    reserva?: string;
  };
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

function monthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toFormValues(booking: {
  id: string;
  propertyId: string;
  guest: { id: string };
  checkIn: Date;
  checkOut: Date;
  pricePerNight: unknown;
  depositAmount: unknown;
  paymentType: "EFECTIVO" | "TRANSFERENCIA";
  paymentMethod: string | null;
  notes: string | null;
  transferRecipientId: string | null;
}) {
  return {
    id: booking.id,
    propertyId: booking.propertyId,
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

export default async function CalendarioPage({ searchParams }: CalendarioPageProps) {
  await requireAdmin();

  const basePath = "/admin/calendario";
  const month =
    searchParams?.mes && VALID_MONTH.test(searchParams.mes)
      ? searchParams.mes
      : toDateStr(new Date()).slice(0, 7);
  const { start, end } = monthBounds(month);

  const properties = await getAllPropertiesForAdmin();

  // `propiedad` must be a known property id, the literal "todas", or empty
  // (which defaults to "todas"); anything else falls back to "todas".
  const propiedadRaw = searchParams?.propiedad?.trim() ?? "";
  const specific = properties.find((property) => property.id === propiedadRaw);
  const propiedadParam = specific ? specific.id : "todas";

  const [bookings, editingBooking, recipients, guests] = await Promise.all([
    prisma.booking.findMany({
      where: {
        checkIn: { lt: end },
        checkOut: { gt: start },
        ...(specific ? { propertyId: specific.id } : {}),
      },
      orderBy: { checkIn: "asc" },
      include: {
        guest: true,
        property: { select: { id: true, title: true } },
      },
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

  // Only a booking of the filtered property may be edited here when a
  // property filter is active (same guard as the agenda page).
  const editing =
    editingBooking &&
    (!specific || editingBooking.propertyId === specific.id)
      ? editingBooking
      : null;

  const events: CalendarEvent[] = bookings.map((booking) => ({
    id: booking.id,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guest: { firstName: booking.guest.firstName, lastName: booking.guest.lastName },
    property: { id: booking.property.id, title: booking.property.title },
  }));

  const propertyByBookingId = new Map(
    events.map((event) => [event.id, event.property.id]),
  );

  const chipHref = (bookingId: string): string =>
    `/admin/propiedades/${propertyByBookingId.get(bookingId)}/agenda?reserva=${bookingId}`;

  const dayHref = (dayStr: string): string =>
    `${basePath}?nueva=1&fecha=${dayStr}&propiedad=${propiedadParam}`;

  const currentParams = `?mes=${month}&propiedad=${propiedadParam}`;
  const prevMonthDate = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)) - 2,
    1,
  );
  const nextMonthDate = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    1,
  );

  // Day-click prefill: `?nueva=1&fecha=YYYY-MM-DD` starts a create form on
  // that day; without it the form defaults to today. Under a specific
  // property filter the property is preselected; under "todas" the select
  // stays empty.
  const nueva = Boolean(searchParams?.nueva);
  const fecha = VALID_DATE.test(searchParams?.fecha ?? "")
    ? (searchParams?.fecha as string)
    : "";
  const dia = VALID_DATE.test(searchParams?.dia ?? "")
    ? (searchParams?.dia as string)
    : "";

  const showCreateForm = !editing && (nueva || Boolean(fecha));
  const initialValues = editing
    ? toFormValues(editing)
    : {
        checkInDate: fecha || toDateStr(new Date()),
        checkInTime: "12:00",
        checkOutTime: "10:00",
        propertyId: specific ? specific.id : "",
      };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <AdminPageHeader title="Calendario" />
        <form method="get" action={basePath} className="flex items-end gap-2">
          {/* Month and current property filter travel with every refetch. */}
          {searchParams?.mes && (
            <input type="hidden" name="mes" value={month} />
          )}
          <AdminField label="Propiedad" htmlFor="propiedad">
            <AdminInput
              as="select"
              id="propiedad"
              name="propiedad"
              defaultValue={propiedadParam}
              className="min-w-[12rem]"
            >
              <option value="todas">Todas</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </AdminInput>
          </AdminField>
          <Button type="submit" variant="secondary">
            Aplicar
          </Button>
        </form>
      </div>

      <div className="flex items-center justify-between">
        <Button asChild variant="tertiary">
          <Link
            href={`${basePath}?mes=${monthParam(prevMonthDate)}&propiedad=${propiedadParam}`}
          >
            ← Mes anterior
          </Link>
        </Button>
        <span className="text-body-md font-semibold capitalize text-ink">
          {formatInTz(
            new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1),
            { month: "long", year: "numeric" },
          )}
        </span>
        <Button asChild variant="tertiary">
          <Link
            href={`${basePath}?mes=${monthParam(nextMonthDate)}&propiedad=${propiedadParam}`}
          >
            Mes siguiente →
          </Link>
        </Button>
      </div>

      <CalendarGrid
        month={month}
        events={events}
        properties={properties.map(({ id, title, color }) => ({
          id,
          title,
          color,
        }))}
        mode={specific ? "single" : "todas"}
        chipHref={chipHref}
        dayHref={dayHref}
      />

      {dia && <DayDetailList day={dia} events={events} chipHref={chipHref} />}

      {showCreateForm && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold text-ink">
              Nueva reserva
            </h3>
            <Button asChild variant="tertiary">
              <Link href={`${basePath}${currentParams}`}>Cancelar</Link>
            </Button>
          </div>
          <BookingForm
            action={createBooking}
            initialValues={initialValues}
            guests={guests.map(({ id, firstName, lastName, dni, phone }) => ({
              id,
              firstName,
              lastName,
              dni,
              phone,
            }))}
            recipients={recipients.map(({ id, name }) => ({ id, name }))}
            properties={properties.map(({ id, title }) => ({ id, title }))}
            submitLabel="Crear reserva"
          />
        </div>
      )}

      {editing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold text-ink">
              Editar reserva
            </h3>
            <Button asChild variant="tertiary">
              <Link href={`${basePath}${currentParams}`}>Cancelar edición</Link>
            </Button>
          </div>
          <BookingForm
            action={updateBooking}
            initialValues={toFormValues(editing)}
            guests={guests.map(({ id, firstName, lastName, dni, phone }) => ({
              id,
              firstName,
              lastName,
              dni,
              phone,
            }))}
            recipients={recipients.map(({ id, name }) => ({ id, name }))}
            properties={properties.map(({ id, title }) => ({ id, title }))}
            submitLabel="Guardar cambios"
          />
        </div>
      )}
    </div>
  );
}
