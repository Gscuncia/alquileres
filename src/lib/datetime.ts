/**
 * Fixed UTC-3 datetime helpers.
 *
 * Argentina does not observe DST (UTC-3 year-round since 2008), so instants
 * are built from the explicit `-03:00` offset — exact and dependency-free.
 * `America/Argentina/Buenos_Aires` is used only for formatting through Intl,
 * never for arithmetic.
 *
 * Conventions shared with the booking domain:
 * - `offset` strings keep the `YYYY-MM-DD` + `HH:mm` shape of HTML date/time
 *   inputs (30-minute granularity is enforced upstream by the zod schema).
 * - Stays are half-open intervals [checkIn, checkOut): the check-out instant
 *   itself does not consume a night.
 */

export const BA_TIME_ZONE = "America/Argentina/Buenos_Aires";

export const BA_OFFSET = "-03:00";

const DAY_MS = 24 * 60 * 60 * 1000;

const YMD = "en-CA"; // year-month-day ordering day with 2-digit month/day parts

const datePartsFormatter = new Intl.DateTimeFormat(YMD, {
  timeZone: BA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timePartsFormatter = new Intl.DateTimeFormat(YMD, {
  timeZone: BA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Default display format for conflict/validation messages (es-AR). */
const defaultFormatOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

function partOf(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

/**
 * Builds an instant from a `YYYY-MM-DD` date and a `HH:mm` time, both in
 * fixed UTC-3: `toUtc("2026-10-12", "10:30")` is `2026-10-12T10:30:00-03:00`.
 */
export function toUtc(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00${BA_OFFSET}`);
}

/** `YYYY-MM-DD` in Buenos Aires local time. */
export function toDateStr(date: Date): string {
  const parts = datePartsFormatter.formatToParts(date);
  return `${partOf(parts, "year")}-${partOf(parts, "month")}-${partOf(
    parts,
    "day",
  )}`;
}

/** `HH:mm` in Buenos Aires local time. */
export function toTimeStr(date: Date): string {
  const parts = timePartsFormatter.formatToParts(date);
  return `${partOf(parts, "hour")}:${partOf(parts, "minute")}`;
}

/**
 * Formats an instant in Buenos Aires time with Intl es-AR.
 * Defaults to a concise "12 oct 2026, 10:30" style used in messages.
 */
export function formatInTz(
  date: Date,
  options: Intl.DateTimeFormatOptions = defaultFormatOptions,
): string {
  return new Intl.DateTimeFormat("es-AR", {
    ...options,
    timeZone: BA_TIME_ZONE,
  }).format(date);
}

/**
 * Nights of the stay [checkIn, checkOut) that fall inside the period
 * [from, to): both sides are clamped to their Buenos Aires calendar-midnight,
 * so a stay contributes whole nights only (a check-out day is never counted).
 * Returns 0 when the stay does not overlap the period at all.
 */
export function nightsBetween(
  checkIn: Date,
  checkOut: Date,
  from: Date,
  to: Date,
): number {
  const dayStart = (date: Date): number =>
    new Date(`${toDateStr(date)}T00:00:00${BA_OFFSET}`).getTime();

  const start = Math.max(dayStart(checkIn), dayStart(from));
  const end = Math.min(dayStart(checkOut), dayStart(to));
  const nights = Math.round((end - start) / DAY_MS);

  return Math.max(0, nights);
}
