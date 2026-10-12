/**
 * Pure dashboard metrics over plain booking/expense snapshots.
 *
 * Volumes are tiny (4 properties, manual bookings), so every figure is
 * computed in TypeScript over an already-fetched window instead of through
 * SQL aggregates. Prisma `Decimal` values are converted to `number` ONCE,
 * at the data boundary (`toBookingSnapshot` / `toExpenseSnapshot`); all the
 * math below works with plain numbers. Display formatting is centralized
 * in `formatMoney` (Intl, es-AR).
 *
 * Period conventions shared with the booking domain (`src/lib/datetime.ts`):
 * - A period is the half-open interval [from, to): the `to` date itself is
 *   excluded, so a stay ending on `to` contributes its last night, and
 *   `nightsBetween` handles the clamping.
 * - Stays are [checkIn, checkOut) half-open intervals as well.
 */

import type { Booking, Expense } from "@prisma/client";
import { nightsBetween } from "@/lib/datetime";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Prisma `Decimal` (or anything numeric) flattened to a plain number. */
type NumericLike = number | string | { toString(): string };

function toNumber(value: NumericLike): number {
  return typeof value === "number" ? value : Number(value);
}

/** Booking row flattened for metric math (Decimal fields already numeric). */
export interface BookingSnapshot {
  id: string;
  propertyId: string;
  firstName: string;
  lastName: string;
  checkIn: Date;
  checkOut: Date;
  pricePerNight: number;
  depositAmount: number;
  /** null = deposit pending. */
  settledAt: Date | null;
}

/** Expense row flattened for metric math. */
export interface ExpenseSnapshot {
  id: string;
  propertyId: string | null;
  type: "MANTENIMIENTO" | "CONSORCIO";
  category: string;
  description: string | null;
  amount: number;
  date: Date;
}

type BookingRowLike = Omit<Booking, "pricePerNight" | "depositAmount"> & {
  pricePerNight: NumericLike;
  depositAmount: NumericLike;
};

type ExpenseRowLike = Omit<Expense, "amount"> & { amount: NumericLike };

/** Boundary conversion: Prisma row (with Decimal money) → plain snapshot. */
export function toBookingSnapshot(booking: BookingRowLike): BookingSnapshot {
  return {
    id: booking.id,
    propertyId: booking.propertyId,
    firstName: booking.firstName,
    lastName: booking.lastName,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    pricePerNight: toNumber(booking.pricePerNight),
    depositAmount: toNumber(booking.depositAmount),
    settledAt: booking.settledAt,
  };
}

/** Boundary conversion: Prisma row (with Decimal amount) → plain snapshot. */
export function toExpenseSnapshot(expense: ExpenseRowLike): ExpenseSnapshot {
  return {
    id: expense.id,
    propertyId: expense.propertyId,
    type: expense.type,
    category: expense.category,
    description: expense.description,
    amount: toNumber(expense.amount),
    date: expense.date,
  };
}

/** Centralized es-AR money display (e.g. "$ 360,00"). */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}

/** Whole nights contained in the period [from, to). */
export function nightsInPeriod(from: Date, to: Date): number {
  return nightsBetween(from, to, from, to);
}

/**
 * Revenue per property for the period: Σ nightsBetween(checkIn, checkOut,
 * from, to) × pricePerNight, grouped by propertyId. Stays partially inside
 * the period contribute only the nights inside it. Properties with no
 * bookings simply have no entry — callers render `map.get(id) ?? 0`.
 */
export function revenuePerProperty(
  bookings: BookingSnapshot[],
  from: Date,
  to: Date,
): Map<string, number> {
  const revenue = new Map<string, number>();
  for (const booking of bookings) {
    const nights = nightsBetween(booking.checkIn, booking.checkOut, from, to);
    if (nights === 0) continue;
    const current = revenue.get(booking.propertyId) ?? 0;
    revenue.set(booking.propertyId, current + nights * booking.pricePerNight);
  }
  return revenue;
}

/**
 * Occupancy per property for the period: booked nights inside [from, to)
 * ÷ `nightsInPeriod` (the total nights of the period), as a 0..1 fraction.
 * Returns 0 for an empty/degenerate period, never an error.
 */
export function occupancyPerProperty(
  bookings: BookingSnapshot[],
  from: Date,
  to: Date,
  nightsInPeriod: number,
): Map<string, number> {
  const booked = new Map<string, number>();
  if (nightsInPeriod <= 0) return booked;

  for (const booking of bookings) {
    const nights = nightsBetween(booking.checkIn, booking.checkOut, from, to);
    if (nights === 0) continue;
    const current = booked.get(booking.propertyId) ?? 0;
    booked.set(booking.propertyId, current + nights);
  }

  const occupancy = new Map<string, number>();
  // Callback iteration (not for..of): keeps the lib TS target
  // downlevel-iteration-free while carrying the ratio toward 0..1.
  booked.forEach((nights, propertyId) => {
    occupancy.set(propertyId, nights / nightsInPeriod);
  });
  return occupancy;
}

/**
 * Sum of depositAmount of bookings whose deposit is not settled
 * (`settledAt === null`). Callers pass only the bookings inside the period.
 */
export function pendingDeposits(bookings: BookingSnapshot[]): number {
  return bookings
    .filter((booking) => booking.settledAt === null)
    .reduce((total, booking) => total + booking.depositAmount, 0);
}

/**
 * Check-ins and check-outs (each an instant) falling inside the next
 * `days` days from `now`, sorted chronologically. A short stay can appear
 * in both lists.
 */
export function upcomingMoves(
  bookings: BookingSnapshot[],
  now: Date,
  days = 14,
): { checkIns: BookingSnapshot[]; checkOuts: BookingSnapshot[] } {
  const windowEnd = now.getTime() + days * DAY_MS;
  const within = (instant: Date): boolean =>
    instant.getTime() >= now.getTime() && instant.getTime() < windowEnd;

  const byInstant = (a: BookingSnapshot, b: BookingSnapshot, pick: (b: BookingSnapshot) => Date) =>
    pick(a).getTime() - pick(b).getTime();

  return {
    checkIns: bookings
      .filter((booking) => within(booking.checkIn))
      .sort((a, b) => byInstant(a, b, (booking) => booking.checkIn)),
    checkOuts: bookings
      .filter((booking) => within(booking.checkOut))
      .sort((a, b) => byInstant(a, b, (booking) => booking.checkOut)),
  };
}

/**
 * Revenue for the last `months` calendar months (BA calendar), ending with
 * the month of `today`. Always returns exactly `months` points — months
 * with no revenue are 0. `month` is the `YYYY-MM` key; display formatting
 * belongs to the page.
 */
export function monthlyTrend(
  bookings: BookingSnapshot[],
  today: Date,
  months = 6,
): { month: string; revenue: number }[] {
  const todayStr = (() => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(today);
    const part = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  })();

  const [todayYear, todayMonth] = todayStr.split("-").map(Number);

  const monthKey = (year: number, month: number): string =>
    `${year}-${String(month).padStart(2, "0")}`;

  // Build the last `months` windows [monthStart, nextMonthStart) in UTC-3.
  const windows: { key: string; start: Date; end: Date }[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const zeroBased = todayMonth - 1 - offset;
    const year = todayYear + Math.floor(zeroBased / 12);
    const month = ((zeroBased % 12) + 12) % 12; // 0..11, safe across year wrap
    const key = monthKey(year, month + 1);
    const start = new Date(`${key}-01T00:00:00-03:00`);
    const nextMonth = month + 1 === 12 ? 0 : month + 1;
    const nextYear = month + 1 === 12 ? year + 1 : year;
    const end = new Date(
      `${monthKey(nextYear, nextMonth + 1)}-01T00:00:00-03:00`,
    );
    windows.push({ key, start, end });
  }

  return windows.map(({ key, start, end }) => ({
    month: key,
    revenue: bookings.reduce((total, booking) => {
      const nights = nightsBetween(
        booking.checkIn,
        booking.checkOut,
        start,
        end,
      );
      return total + nights * booking.pricePerNight;
    }, 0),
  }));
}

/** Total expenses for the period (callers pass only in-window expenses). */
export function expensesTotal(expenses: ExpenseSnapshot[]): number {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}
