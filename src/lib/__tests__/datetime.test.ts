import { describe, it, expect } from "vitest";
import {
  toUtc,
  toDateStr,
  toTimeStr,
  formatInTz,
  nightsBetween,
} from "@/lib/datetime";

const ROUND_TRIP_CASES: Array<[string, string]> = [
  ["2026-10-12", "00:00"],
  ["2026-10-12", "10:30"],
  ["2026-10-12", "23:30"],
  ["2026-12-31", "23:30"],
  ["2026-01-01", "00:00"],
  ["2026-02-28", "12:00"],
];

describe("toUtc / toDateStr / toTimeStr (fixed UTC-3)", () => {
  it.each(ROUND_TRIP_CASES)(
    "round-trips %s at %s through Buenos Aires local time",
    (dateStr, timeStr) => {
      const date = toUtc(dateStr, timeStr);
      expect(toDateStr(date)).toBe(dateStr);
      expect(toTimeStr(date)).toBe(timeStr);
    },
  );

  it("maps 10:30 in BA to 13:30 UTC", () => {
    expect(toUtc("2026-10-12", "10:30").toISOString()).toBe(
      "2026-10-12T13:30:00.000Z",
    );
  });

  it("keeps the day when crossing the -03:00 boundary at 23:30", () => {
    // 23:30 local on Oct 12 is 02:30Z on Oct 13 — the local day is still Oct 12.
    const date = toUtc("2026-10-12", "23:30");
    expect(date.toISOString()).toBe("2026-10-13T02:30:00.000Z");
    expect(toDateStr(date)).toBe("2026-10-12");
    expect(toTimeStr(date)).toBe("23:30");
  });

  it("does not jump days at midnight local (UTC-3 year-round, no DST)", () => {
    const date = toUtc("2026-01-01", "00:00");
    expect(date.toISOString()).toBe("2026-01-01T03:00:00.000Z");
  });

  it("parses the explicit -03:00 offset, not the runtime's own zone", () => {
    expect(toUtc("2026-10-12", "10:30").getTime()).toBe(
      new Date("2026-10-12T10:30:00-03:00").getTime(),
    );
  });

  it("formats in es-AR for messages", () => {
    const formatted = formatInTz(toUtc("2026-10-12", "10:30"));
    expect(formatted).toContain("10");
    expect(formatted).toContain("oct");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("10:30");
  });
});

describe("nightsBetween (clamped whole nights)", () => {
  const from = (dateStr: string) => toUtc(dateStr, "00:00");

  it("counts every night of a stay fully inside the period", () => {
    expect(
      nightsBetween(
        toUtc("2026-10-10", "12:00"),
        toUtc("2026-10-12", "10:00"),
        from("2026-10-01"),
        from("2026-11-01"),
      ),
    ).toBe(2);
  });

  it("prorates: Oct 1–15 period, stay Sep 30 18:00 → Oct 5 10:00 = 4 nights", () => {
    expect(
      nightsBetween(
        toUtc("2026-09-30", "18:00"),
        toUtc("2026-10-05", "10:00"),
        from("2026-10-01"),
        from("2026-10-15"),
      ),
    ).toBe(4);
  });

  it("clamps a stay that starts before the period", () => {
    expect(
      nightsBetween(
        toUtc("2026-09-25", "12:00"),
        toUtc("2026-10-03", "10:00"),
        from("2026-10-01"),
        from("2026-10-15"),
      ),
    ).toBe(2);
  });

  it("clamps a stay that ends after the period (check-out day not counted)", () => {
    // Oct 25 12:00 → Nov 3 10:00 inside October: nights starting Oct 25..31
    // (7 nights); the check-out day's nights would fall outside the period.
    expect(
      nightsBetween(
        toUtc("2026-10-25", "12:00"),
        toUtc("2026-11-03", "10:00"),
        from("2026-10-01"),
        from("2026-11-01"),
      ),
    ).toBe(7);
  });

  it("returns 0 when the stay does not overlap the period", () => {
    expect(
      nightsBetween(
        toUtc("2026-11-10", "12:00"),
        toUtc("2026-11-13", "10:00"),
        from("2026-10-01"),
        from("2026-10-15"),
      ),
    ).toBe(0);
  });

  it("returns 0 when the stay ends exactly when the period starts", () => {
    expect(
      nightsBetween(
        toUtc("2026-09-28", "12:00"),
        toUtc("2026-10-01", "10:00"),
        from("2026-10-01"),
        from("2026-10-15"),
      ),
    ).toBe(0);
  });

  it("returns 0 when the stay starts exactly when the period ends", () => {
    expect(
      nightsBetween(
        toUtc("2026-10-15", "12:00"),
        toUtc("2026-10-18", "10:00"),
        from("2026-10-01"),
        from("2026-10-15"),
      ),
    ).toBe(0);
  });

  it("returns 0 for a same-day round trip (check-in at 12:00, check-out at 23:30)", () => {
    expect(
      nightsBetween(
        toUtc("2026-10-10", "12:00"),
        toUtc("2026-10-10", "23:30"),
        from("2026-10-01"),
        from("2026-11-01"),
      ),
    ).toBe(0);
  });
});
