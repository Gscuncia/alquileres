/**
 * Pure overlap predicate for stays — no Prisma, no I/O.
 *
 * Two stays conflict iff their half-open intervals [in, out) intersect.
 * Back-to-back stays (aOut === bIn) share zero measurable time and are
 * explicitly NOT a conflict:
 *
 *   stay A: Oct 10 12:00 → Oct 13 10:00
 *   stay B: Oct 13 10:00 → Oct 15 12:00   → no conflict
 *
 * Conflicts are per-property: scoping by `propertyId` happens at query level
 * (see `src/app/admin/bookings/actions.ts`), never here.
 */
export function intervalsOverlap(
  aIn: Date,
  aOut: Date,
  bIn: Date,
  bOut: Date,
): boolean {
  return aIn < bOut && aOut > bIn;
}
