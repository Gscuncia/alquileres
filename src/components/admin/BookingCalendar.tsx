import Link from "next/link";
import { formatInTz, toUtc } from "@/lib/datetime";

export interface CalendarBooking {
  id: string;
  firstName: string;
  lastName: string;
  checkIn: Date;
  checkOut: Date;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const MONTH_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "long",
  year: "numeric",
};

function cellClasses(highlighted: boolean): string {
  const base =
    "flex h-9 items-center justify-center rounded-sm text-caption-sm text-body";
  return highlighted
    ? `${base} bg-sky font-medium text-ink`
    : `${base} bg-surface-soft`;
}

function MonthBookingsList({
  bookings,
  bookingHref,
}: {
  bookings: CalendarBooking[];
  bookingHref?: (id: string) => string;
}) {
  if (bookings.length === 0) {
    return (
      <p className="text-caption-sm text-muted">
        No hay reservas que superpongan con este mes.
      </p>
    );
  }

  return (
    <ul className=" divide-y divide-hairline rounded-md border border-hairline">
      {bookings.map((booking) => {
        const description = `${booking.firstName} ${booking.lastName} — ${formatInTz(
          booking.checkIn,
        )} → ${formatInTz(booking.checkOut)}`;
        return (
          <li
            key={booking.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="text-body-sm text-body">{description}</span>
            {bookingHref && (
              <Link
                href={bookingHref(booking.id)}
                className="text-button-sm text-ink underline-offset-2 hover:underline"
              >
                Editar
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Server-rendered month grid: `?mes=YYYY-MM` navigates months through plain
 * links, days covered by any stay (half-open [checkIn, checkOut) interval)
 * are highlighted, and the month's bookings are listed under the grid.
 */
export function BookingCalendar({
  month,
  bookings,
  navBasePath,
  bookingHref,
}: {
  month: string;
  bookings: CalendarBooking[];
  navBasePath: string;
  bookingHref?: (id: string) => string;
}) {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  // Monday-first grid offset.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  const coveredDays = new Set<string>();
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${month}-${String(day).padStart(2, "0")}`;
    const dayStart = toUtc(dayStr, "00:00");
    // Next day 00:00 AT-3 is the exclusive end of this calendar day.
    const nextMonthDay =
      day === daysInMonth
        ? new Date(year, monthIndex + 1, 1)
        : new Date(year, monthIndex, day + 1);
    const nextMonthStr = `${nextMonthDay.getFullYear()}-${String(
      nextMonthDay.getMonth() + 1,
    ).padStart(2, "0")}-${String(nextMonthDay.getDate()).padStart(2, "0")}`;
    const dayEnd = toUtc(nextMonthStr, "00:00");

    for (const booking of bookings) {
      if (booking.checkIn < dayEnd && booking.checkOut > dayStart) {
        coveredDays.add(dayStr);
        break;
      }
    }
  }

  const prevMonth = new Date(year, monthIndex - 1, 1);
  const nextMonth = new Date(year, monthIndex + 1, 1);
  const monthParam = (date: Date): string =>
    `?mes=${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`${navBasePath}${monthParam(prevMonth)}`}
          className="text-button-sm text-ink underline-offset-2 hover:underline"
        >
          ← Mes anterior
        </Link>
        <h3 className="text-body-md font-semibold capitalize text-ink">
          {formatInTz(firstOfMonth, MONTH_FORMAT_OPTIONS)}
        </h3>
        <Link
          href={`${navBasePath}${monthParam(nextMonth)}`}
          className="text-button-sm text-ink underline-offset-2 hover:underline"
        >
          Mes siguiente →
        </Link>
      </div>

      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={`Calendario de reservas — ${formatInTz(
          firstOfMonth,
          MONTH_FORMAT_OPTIONS,
        )}`}
      >
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex h-8 items-center justify-center text-caption-sm font-semibold text-muted"
          >
            {label}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const dayStr = `${month}-${String(day).padStart(2, "0")}`;
          return (
            <div key={dayStr} className={cellClasses(coveredDays.has(dayStr))}>
              {day}
            </div>
          );
        })}
      </div>

      <MonthBookingsList bookings={bookings} bookingHref={bookingHref} />
    </section>
  );
}
