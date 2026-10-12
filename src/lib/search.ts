/**
 * Accent- and case-insensitive text search normalization.
 *
 * Postgres cannot do accent-insensitive matching without the `unaccent`
 * extension, so both guests and reservas search normalize in TypeScript
 * instead: the query and the stored text are folded to the same plain
 * form (NFD decomposes accented letters, then combining marks are
 * stripped). Volumes are tiny (owner's manual data), so fetching rows
 * and filtering in memory is acceptable.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    // NFD decomposes each accented letter into a base letter + one combining
    // mark from the Combining Diacritical Marks block (U+0300–U+036F), so
    // stripping that range is equivalent to `\p{M}` without requiring the
    // `u` flag (kept ES5-target-friendly).
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
