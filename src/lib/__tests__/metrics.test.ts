import { describe, it, expect } from "vitest";
import {
  toBookingSnapshot,
  toExpenseSnapshot,
  formatMoney,
  nightsInPeriod,
  revenuePerProperty,
  occupancyPerProperty,
  pendingDeposits,
  upcomingMoves,
  monthlyTrend,
  expensesTotal,
} from "@/lib/metrics";
import { toUtc } from "@/lib/datetime";

/**
 * Prisma Decimal values behave like numbers through Number(); the boundary
 * converters must accept them without loss.
 */
const decimalLike = (value: number) => ({
  toString: () => String(value),
});

function booking(overrides = {}) {
  return {
    id: "b-1",
    propertyId: "p-1",
    guest: { firstName: "Juan", lastName: "Pérez" },
    checkIn: toUtc("2026-10-01", "14:00"),
    checkOut: toUtc("2026-10-03", "10:00"),
    pricePerNight: 100,
    depositAmount: 0,
    settledAt: null,
    ...overrides,
  };
}

const from = toUtc("2026-10-01", "00:00");
const to = toUtc("2026-10-15", "00:00"); // exclusive upper bound

describe("boundary conversion", () => {
  it("flattens Decimal-like money fields to plain numbers", () => {
    const row = {
      id: "b-1",
      propertyId: "p-1",
      guest: { firstName: "Juan", lastName: "Pérez" },
      checkIn: toUtc("2026-10-01", "14:00"),
      checkOut: toUtc("2026-10-03", "10:00"),
      pricePerNight: decimalLike(100),
      depositAmount: decimalLike(50),
      settledAt: null,
    };

    const snapshot = toBookingSnapshot(row as never);

    expect(snapshot.pricePerNight).toBe(100);
    expect(snapshot.depositAmount).toBe(50);
  });

  it("flattens an expense amount and keeps the rest of the shape", () => {
    const snapshot = toExpenseSnapshot({
      id: "e-1",
      propertyId: "p-1",
      type: "MANTENIMIENTO",
      category: "Plomería",
      description: null,
      amount: decimalLike(150),
      date: toUtc("2026-10-02", "00:00"),
    } as never);

    expect(snapshot.amount).toBe(150);
    expect(snapshot.type).toBe("MANTENIMIENTO");
  });
});

describe("revenuePerProperty", () => {
  it("sums a full 2-night stay × $100 = $200 for its property", () => {
    const revenue = revenuePerProperty(
      [booking({ checkIn: toUtc("2026-10-01", "14:00"), checkOut: toUtc("2026-10-03", "10:00") })],
      from,
      to,
    );

    expect(revenue.get("p-1")).toBe(200);
  });

  it("prorates a stay crossing the period: Sep 30 18:00 → Oct 5 10:00 in Oct 1–15 at $90 = 4 nights = $360", () => {
    const revenue = revenuePerProperty(
      [
        booking({
          checkIn: toUtc("2026-09-30", "18:00"),
          checkOut: toUtc("2026-10-05", "10:00"),
          pricePerNight: 90,
        }),
      ],
      from,
      to,
    );

    expect(revenue.get("p-1")).toBe(360);
  });

  it("returns an empty map (never an error) for zero bookings", () => {
    expect(revenuePerProperty([], from, to).size).toBe(0);
  });

  it("stays entirely outside the period contribute nothing", () => {
    const revenue = revenuePerProperty(
      [booking({ checkIn: toUtc("2026-11-01", "14:00"), checkOut: toUtc("2026-11-05", "10:00") })],
      from,
      to,
    );

    expect(revenue.size).toBe(0);
  });

  it("groups revenue by propertyId", () => {
    const revenue = revenuePerProperty(
      [
        booking({ id: "b-1" }),
        booking({ id: "b-2", propertyId: "p-2" }),
        booking({ id: "b-3" }),
      ],
      from,
      to,
    );

    expect(revenue.get("p-1")).toBe(400); // 2 stays × 2 nights × $100
    expect(revenue.get("p-2")).toBe(200);
  });
});

describe("nightsInPeriod", () => {
  it("counts the whole nights of [from, to)", () => {
    expect(nightsInPeriod(from, to)).toBe(14);
    expect(nightsInPeriod(toUtc("2026-10-01", "00:00"), toUtc("2026-10-11", "00:00"))).toBe(10);
  });
});

describe("occupancyPerProperty", () => {
  it("shows 6 booked nights over a 10-night period as 60%", () => {
    const oct1 = toUtc("2026-10-01", "00:00");
    const oct11 = toUtc("2026-10-11", "00:00");
    const booked = [
      // 3 + 3 nights inside the 10-night period.
      booking({ checkIn: toUtc("2026-10-02", "12:00"), checkOut: toUtc("2026-10-05", "10:00") }),
      booking({ checkIn: toUtc("2026-10-07", "14:00"), checkOut: toUtc("2026-10-10", "10:00") }),
    ];

    const occupancy = occupancyPerProperty(booked, oct1, oct11, 10);

    expect(occupancy.get("p-1")).toBeCloseTo(0.6);
  });

  it("returns no entry (and never an error) for a degenerate period", () => {
    const occupancy = occupancyPerProperty([booking()], from, from, 0);

    expect(occupancy.size).toBe(0);
  });
});

describe("pendingDeposits", () => {
  it("sums $50 + $20 = $70 for unsettled deposits and excludes settled ones", () => {
    const pending = pendingDeposits([
      booking({ depositAmount: 50 }),
      booking({ id: "b-2", depositAmount: 20 }),
      booking({ id: "b-3", depositAmount: 30, settledAt: toUtc("2026-10-02", "10:00") }),
      booking({ id: "b-4", depositAmount: 10, settledAt: new Date() }),
    ]);

    expect(pending).toBe(70);
  });

  it("returns 0 (never an error) for zero bookings", () => {
    expect(pendingDeposits([])).toBe(0);
  });
});

describe("upcomingMoves", () => {
  const now = toUtc("2026-10-12", "12:00");

  it("shows a check-in tomorrow and excludes one 20 days out", () => {
    const tomorrow = toUtc("2026-10-13", "14:00");
    const later = toUtc("2026-11-01", "14:00");
    const bookings = [
      booking({ id: "b-1", checkIn: tomorrow, checkOut: toUtc("2026-10-15", "10:00") }),
      booking({ id: "b-2", checkIn: later, checkOut: toUtc("2026-11-05", "10:00") }),
    ];

    const moves = upcomingMoves(bookings, now);

    expect(moves.checkIns.map((b) => b.id)).toEqual(["b-1"]);
    expect(moves.checkOuts.map((b) => b.id)).toEqual(["b-1"]);
  });

  it("lists check-outs within the window; an instant at the window end is excluded", () => {
    const atEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const bookings = [
      booking({ id: "b-1", checkIn: toUtc("2026-10-13", "14:00"), checkOut: toUtc("2026-10-14", "10:00") }),
      booking({ id: "b-2", checkIn: toUtc("2026-10-20", "14:00"), checkOut: atEnd }),
    ];

    const moves = upcomingMoves(bookings, now);

    expect(moves.checkOuts.map((b) => b.id)).toEqual(["b-1"]);
  });

  it("sorts chronologically", () => {
    const bookings = [
      booking({ id: "b-1", checkIn: toUtc("2026-10-16", "14:00"), checkOut: toUtc("2026-10-18", "10:00") }),
      booking({ id: "b-2", checkIn: toUtc("2026-10-13", "14:00"), checkOut: toUtc("2026-10-15", "10:00") }),
    ];

    const moves = upcomingMoves(bookings, now);

    expect(moves.checkIns.map((b) => b.id)).toEqual(["b-2", "b-1"]);
  });
});

describe("monthlyTrend", () => {
  it("always returns 6 monthly points ending with the month of today", () => {
    const today = toUtc("2026-10-12", "12:00");
    const trend = monthlyTrend([], today);

    expect(trend).toHaveLength(6);
    expect(trend[5].month).toBe("2026-10");
    expect(trend[0].month).toBe("2026-05");
    expect(trend.every((point) => point.revenue === 0)).toBe(true);
  });

  it("assigns each booking's nights to its calendar month", () => {
    const today = toUtc("2026-10-12", "12:00");
    const trend = monthlyTrend(
      [
        booking({
          checkIn: toUtc("2026-08-10", "14:00"),
          checkOut: toUtc("2026-08-14", "10:00"),
          pricePerNight: 80,
        }),
      ],
      today,
    );

    const august = trend.find((point) => point.month === "2026-08");
    expect(august?.revenue).toBe(320);
    expect(trend.filter((point) => point.revenue > 0)).toHaveLength(1);
  });

  it("prorates a stay that spans the month boundary between two trend months", () => {
    const today = toUtc("2026-10-12", "12:00");
    const trend = monthlyTrend(
      [
        // Sep 30 20:00 → Oct 2 10:00: 2 nights total, 1 per month
        // (the check-out day is never counted).
        booking({
          checkIn: toUtc("2026-09-30", "20:00"),
          checkOut: toUtc("2026-10-02", "10:00"),
          pricePerNight: 100,
        }),
      ],
      today,
    );

    expect(trend.find((point) => point.month === "2026-09")?.revenue).toBe(100);
    expect(trend.find((point) => point.month === "2026-10")?.revenue).toBe(100);
  });
});

describe("expensesTotal", () => {
  it("sums all expense amounts (maintenance and consorcio alike)", () => {
    const total = expensesTotal([
      toExpenseSnapshot({ id: "e-1", propertyId: "p-1", type: "MANTENIMIENTO", category: "Plomería", description: null, amount: decimalLike(120), date: new Date() } as never),
      toExpenseSnapshot({ id: "e-2", propertyId: null, type: "CONSORCIO", category: "Expensas", description: null, amount: decimalLike(30), date: new Date() } as never),
    ]);

    expect(total).toBe(150);
  });

  it("returns 0 (never an error) for zero expenses", () => {
    expect(expensesTotal([])).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formats with Intl es-AR currency display", () => {
    // The separator between "$" and the amount may be a regular or
    // non-breaking space depending on the ICU build; assert both parts.
    expect(formatMoney(360)).toMatch(/^\$\s*360,00$/);
    expect(formatMoney(1234.5)).toMatch(/^\$\s*1\.234,50$/);
  });
});
