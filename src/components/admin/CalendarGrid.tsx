import Link from "next/link";
import { formatInTz, toDateStr, toTimeStr, toUtc } from "@/lib/datetime";

export interface CalendarEvent {
  id: string;
  checkIn: Date;
  checkOut: Date;
  guest: { firstName: string; lastName: string };
  property: { id: string; title: string };
}

export interface CalendarChip {
  bookingId: string;
  /** `→ 12:00 Juan` on the BA check-in day, `← 10:00 Juan` on check-out. */
  text: string;
  /** Stable palette slot resolved from the property order. */
  paletteIndex: number;
}

export interface CalendarBar {
  bookingId: string;
  /** Stable palette slot resolved from the property order. */
  paletteIndex: number;
  /** Tooltip/aria label: `Juan Pérez · Depto 1`. */
  label: string;
}

export type CalendarGridMode = "todas" | "single";

interface CalendarGridProps {
  /** `YYYY-MM`, validated by the calling page. */
  month: string;
  events: CalendarEvent[];
  properties: { id: string; title: string }[];
  mode: CalendarGridMode;
  chipHref(bookingId: string): string;
  /** `YYYY-MM-DD` target for the day link and the overflow chip. */
  dayHref(dayStr: string): string;
  /** Agenda keeps its month booking list under the grid. */
  showMonthList?: boolean;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const MONTH_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "long",
  year: "numeric",
};

/** Max chips per cell before collapsing into the "+n más" day link. */
const MAX_CHIPS = 2;

// Four stable background tokens cover the seeded properties; extra
// properties cycle through the palette by id order.
export const CHIP_PALETTE = [
  "bg-sky text-ink",
  "bg-cream-strong text-ink",
  "bg-luxe text-on-dark",
  "bg-plus text-on-dark",
] as const;

function paletteIndexFor(properties: { id: string }[], propertyId: string): number {
  const index = properties.findIndex((property) => property.id === propertyId);
  if (index < 0) return 0;
  return index % CHIP_PALETTE.length;
}

function chipClass(paletteIndex: number, mode: CalendarGridMode): string {
  if (mode === "single") return "bg-sky text-ink";
  return CHIP_PALETTE[paletteIndex] ?? CHIP_PALETTE[0];
}

/**
 * Pure chip builder (exported for tests): every event contributes at most
 * two chips keyed by its BA calendar date — one arrow chip on the check-in
 * day and one on the check-out day. Month-boundary stays appear in both
 * months automatically because the keys are plain calendar dates.
 */
export function buildDayChips(
  events: CalendarEvent[],
  properties: { id: string }[],
): Map<string, CalendarChip[]> {
  const chips = new Map<string, CalendarChip[]>();

  const push = (dayStr: string, chip: CalendarChip): void => {
    const list = chips.get(dayStr) ?? [];
    list.push(chip);
    chips.set(dayStr, list);
  };

  for (const event of events) {
    const paletteIndex = paletteIndexFor(properties, event.property.id);
    const checkInDay = toDateStr(event.checkIn);
    const checkOutDay = toDateStr(event.checkOut);

    push(checkInDay, {
      bookingId: event.id,
      text: `→ ${toTimeStr(event.checkIn)} ${event.guest.firstName}`,
      paletteIndex,
    });

    // Same-day events carry only the check-in chip.
    if (checkOutDay !== checkInDay) {
      push(checkOutDay, {
        bookingId: event.id,
        text: `← ${toTimeStr(event.checkOut)} ${event.guest.firstName}`,
        paletteIndex,
      });
    }
  }

  return chips;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pure bar builder (exported for tests): every event paints ONE small
 * colored rectangle per covered BA calendar day — from the check-in day
 * through the check-out day inclusive — so a stay reads as a continuous
 * strip of per-day rectangles in its property's palette color. Overlapping
 * stays (back-to-back on the same day) each contribute their own bar.
 */
export function buildDayBars(
  events: CalendarEvent[],
  properties: { id: string; title: string }[],
): Map<string, CalendarBar[]> {
  const bars = new Map<string, CalendarBar[]>();

  const push = (dayStr: string, bar: CalendarBar): void => {
    const list = bars.get(dayStr) ?? [];
    list.push(bar);
    bars.set(dayStr, list);
  };

  for (const event of events) {
    const paletteIndex = paletteIndexFor(properties, event.property.id);
    const label = `${event.guest.firstName} ${event.guest.lastName} · ${event.property.title}`;

    let cursor = toUtc(toDateStr(event.checkIn), "00:00");
    const lastDay = toUtc(toDateStr(event.checkOut), "00:00");
    while (cursor.getTime() <= lastDay.getTime()) {
      push(toDateStr(cursor), { bookingId: event.id, paletteIndex, label });
      cursor = new Date(cursor.getTime() + DAY_MS);
    }
  }

  return bars;
}

function cellClasses(): string {
  return "flex h-28 flex-col items-start gap-1 rounded-sm p-1 text-caption-sm bg-surface-soft";
}

function DayCell({
  dayStr,
  dayNumber,
  chips,
  bars,
  mode,
  chipHref,
  dayHref,
}: {
  dayStr: string;
  dayNumber: number;
  chips: CalendarChip[];
  bars: CalendarBar[];
  mode: CalendarGridMode;
  chipHref(bookingId: string): string;
  dayHref(dayStr: string): string;
}) {
  const overflow = Math.max(0, chips.length - MAX_CHIPS);
  const visible = chips.slice(0, MAX_CHIPS);

  return (
    <div key={dayStr} className={cellClasses()}>
      <Link
        href={dayHref(dayStr)}
        className="font-medium text-ink underline-offset-2 hover:underline"
      >
        {dayNumber}
      </Link>
      {bars.length > 0 && (
        <div className="flex w-full flex-col gap-0.5">
          {bars.map((bar) => (
            <Link
              key={`${dayStr}-${bar.bookingId}`}
              href={chipHref(bar.bookingId)}
              aria-label={`Reserva de ${bar.label}`}
              title={bar.label}
              className={`h-2 w-full rounded-full ${chipClass(
                bar.paletteIndex,
                mode,
              )}`}
            >
              {/* Intentionally empty: the bar is the visual. */}
              &nbsp;
            </Link>
          ))}
        </div>
      )}
      {visible.map((chip) => (
        <Link
          key={`${dayStr}-${chip.bookingId}-${chip.text}`}
          href={chipHref(chip.bookingId)}
          className={`w-full truncate rounded-sm px-1 py-0.5 text-caption-sm ${chipClass(
            chip.paletteIndex,
            mode,
          )}`}
          title={chip.text}
        >
          {chip.text}
        </Link>
      ))}
      {overflow > 0 && (
        <Link
          href={dayHref(dayStr)}
          className="text-caption-sm text-muted underline-offset-2 hover:underline"
        >
          +{overflow} más
        </Link>
      )}
    </div>
  );
}

function MonthBookingsList({
  events,
  chipHref,
}: {
  events: CalendarEvent[];
  chipHref(bookingId: string): string;
}) {
  if (events.length === 0) {
    return (
      <p className="text-caption-sm text-muted">
        No hay reservas que superpongan con este mes.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-hairline rounded-md border border-hairline">
      {events.map((event) => {
        const description = `${event.guest.firstName} ${event.guest.lastName} — ${formatInTz(
          event.checkIn,
        )} → ${formatInTz(event.checkOut)}`;
        return (
          <li
            key={event.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="text-body-sm text-body">{description}</span>
            <Link
              href={chipHref(event.id)}
              className="text-button-sm text-ink underline-offset-2 hover:underline"
            >
              Editar
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Server-rendered month grid with stay chips and per-day color bars:
 * `→ HH:mm Nombre` on the check-in BA day, `← HH:mm Nombre` on the
 * check-out day, at most 2 chips per cell before the "+n más" day link.
 * Every day of a stay (check-in through check-out day) carries a small
 * colored rectangle per booking in the occupying property's palette color
 * (`single` mode uses the accent; `todas` uses the per-property palette
 * plus a legend), so overlapping stays stay visually distinguishable.
 */
export function CalendarGrid({
  month,
  events,
  properties,
  mode,
  chipHref,
  dayHref,
  showMonthList = false,
}: CalendarGridProps) {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  // Monday-first grid offset.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  const chipsByDay = buildDayChips(events, properties);
  const barsByDay = buildDayBars(events, properties);

  return (
    <section className="space-y-4">
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
            <DayCell
              key={dayStr}
              dayStr={dayStr}
              dayNumber={day}
              chips={chipsByDay.get(dayStr) ?? []}
              bars={barsByDay.get(dayStr) ?? []}
              mode={mode}
              chipHref={chipHref}
              dayHref={dayHref}
            />
          );
        })}
      </div>

      {mode === "todas" && properties.length > 0 && (
        <ul className="flex flex-wrap items-center gap-4" aria-label="Leyenda de colores por propiedad">
          {properties.map((property, index) => (
            <li
              key={property.id}
              className="flex items-center gap-2 text-caption-sm text-body"
            >
              <span
                aria-hidden="true"
                className={`inline-block h-3 w-3 rounded-full ${
                  CHIP_PALETTE[index % CHIP_PALETTE.length]
                }`}
              />
              {property.title}
            </li>
          ))}
        </ul>
      )}

      {showMonthList && (
        <MonthBookingsList events={events} chipHref={chipHref} />
      )}
    </section>
  );
}

/**
 * `?dia=YYYY-MM-DD` detail: an ordered list of the events covering that day
 * (time ascending by check-in) with edit links — no new route needed.
 */
export function DayDetailList({
  day,
  events,
  chipHref,
}: {
  day: string;
  events: CalendarEvent[];
  chipHref(bookingId: string): string;
}) {
  const dayStart = toUtc(day, "00:00");
  const nextDayNumber = new Date(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)) + 1,
  );
  const nextDayStr = `${nextDayNumber.getFullYear()}-${String(
    nextDayNumber.getMonth() + 1,
  ).padStart(2, "0")}-${String(nextDayNumber.getDate()).padStart(2, "0")}`;
  const dayEnd = toUtc(nextDayStr, "00:00");

  const covering = events
    .filter((event) => event.checkIn < dayEnd && event.checkOut > dayStart)
    .sort((a, b) => toTimeStr(a.checkIn).localeCompare(toTimeStr(b.checkIn)));

  if (covering.length === 0) {
    return (
      <p className="text-caption-sm text-muted">
        No hay reservas activas en ese día.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-hairline rounded-md border border-hairline">
      {covering.map((event) => (
        <li
          key={event.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <span className="text-body-sm text-body">
            {event.guest.firstName} {event.guest.lastName} —{" "}
            {formatInTz(event.checkIn)} → {formatInTz(event.checkOut)} ·{" "}
            {event.property.title}
          </span>
          <Link
            href={chipHref(event.id)}
            className="text-button-sm text-ink underline-offset-2 hover:underline"
          >
            Editar
          </Link>
        </li>
      ))}
    </ol>
  );
}
