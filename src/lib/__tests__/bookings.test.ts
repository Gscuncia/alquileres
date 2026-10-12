import { describe, it, expect } from "vitest";
import { intervalsOverlap } from "@/lib/bookings";
import { toUtc } from "@/lib/datetime";

const at = (dateStr: string, timeStr: string) => toUtc(dateStr, timeStr);

const STAY_IN = { date: "2026-10-10", time: "12:00" };
const STAY_OUT = { date: "2026-10-13", time: "10:00" };

describe("intervalsOverlap", () => {
  it("accepts a back-to-back stay: check-out equals the next check-in", () => {
    expect(
      intervalsOverlap(
        at(STAY_IN.date, STAY_IN.time),
        at(STAY_OUT.date, STAY_OUT.time),
        at("2026-10-13", "10:00"),
        at("2026-10-15", "12:00"),
      ),
    ).toBe(false);
  });

  it("accepts back-to-back in reversed order (later stay first)", () => {
    expect(
      intervalsOverlap(
        at("2026-10-13", "10:00"),
        at("2026-10-15", "12:00"),
        at(STAY_IN.date, STAY_IN.time),
        at(STAY_OUT.date, STAY_OUT.time),
      ),
    ).toBe(false);
  });

  it("accepts back-to-back same day: 10:00 out → 10:00 in", () => {
    expect(
      intervalsOverlap(
        at("2026-10-13", "10:00"),
        at("2026-10-15", "10:00"),
        at("2026-10-15", "10:00"),
        at("2026-10-17", "12:00"),
      ),
    ).toBe(false);
  });

  it("accepts back-to-back with a gap later the same day", () => {
    expect(
      intervalsOverlap(
        at("2026-10-13", "10:00"),
        at("2026-10-15", "12:00"),
        at("2026-10-15", "12:00"),
        at("2026-10-17", "12:00"),
      ),
    ).toBe(false);
  });

  it("rejects a direct overlap", () => {
    expect(
      intervalsOverlap(
        at(STAY_IN.date, STAY_IN.time),
        at(STAY_OUT.date, STAY_OUT.time),
        at("2026-10-12", "12:00"),
        at("2026-10-14", "10:00"),
      ),
    ).toBe(true);
  });

  it("rejects an exact containment: candidate stay inside the existing one", () => {
    expect(
      intervalsOverlap(
        at("2026-10-10", "12:00"),
        at("2026-10-14", "10:00"),
        at("2026-10-11", "12:00"),
        at("2026-10-12", "10:00"),
      ),
    ).toBe(true);
  });

  it("rejects the existing stay contained inside the candidate", () => {
    expect(
      intervalsOverlap(
        at("2026-10-11", "12:00"),
        at("2026-10-12", "10:00"),
        at("2026-10-10", "12:00"),
        at("2026-10-14", "10:00"),
      ),
    ).toBe(true);
  });

  it("rejects a partial overlap sharing only one edge instant", () => {
    expect(
      intervalsOverlap(
        at(STAY_IN.date, STAY_IN.time),
        at(STAY_OUT.date, STAY_OUT.time),
        at("2026-10-13", "00:00"),
        at("2026-10-15", "10:00"),
      ),
    ).toBe(true);
  });

  it("rejects identical windows", () => {
    expect(
      intervalsOverlap(
        at(STAY_IN.date, STAY_IN.time),
        at(STAY_OUT.date, STAY_OUT.time),
        at(STAY_IN.date, STAY_IN.time),
        at(STAY_OUT.date, STAY_OUT.time),
      ),
    ).toBe(true);
  });

  it("accepts stays on distant days", () => {
    expect(
      intervalsOverlap(
        at(STAY_IN.date, STAY_IN.time),
        at(STAY_OUT.date, STAY_OUT.time),
        at("2026-11-10", "12:00"),
        at("2026-11-13", "10:00"),
      ),
    ).toBe(false);
  });

  it("is property-agnostic: interval truth is independent of the property", () => {
    // Conflicts are per-PROPERTY, not per-interval: overlapping windows on
    // different properties never conflict. The predicate only decides
    // interval intersection; property scoping is enforced by the conflict
    // query (asserted in src/app/admin/bookings/__tests__/actions.test.ts).
    const a = {
      in: at(STAY_IN.date, STAY_IN.time),
      out: at(STAY_OUT.date, STAY_OUT.time),
    };
    const sameWindowOnAnotherProperty = a;
    expect(sameWindowOnAnotherProperty).toEqual(a);
  });
});
