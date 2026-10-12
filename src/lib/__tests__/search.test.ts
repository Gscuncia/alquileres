import { describe, it, expect } from "vitest";
import { normalizeForSearch } from "@/lib/search";

describe("normalizeForSearch", () => {
  it("normalizes 'Pérez' to 'perez' (accents and case folded)", () => {
    expect(normalizeForSearch("Pérez")).toBe("perez");
  });

  it("keeps digits untouched", () => {
    expect(normalizeForSearch("30123456")).toBe("30123456");
    expect(normalizeForSearch("155-5123")).toBe("155-5123");
  });

  it("folds accented vowels with other diacritics too", () => {
    expect(normalizeForSearch("Álvarez")).toBe("alvarez");
    expect(normalizeForSearch("GÓMEZ")).toBe("gomez");
  });

  it("is idempotent for already-plain lowercase text", () => {
    expect(normalizeForSearch(normalizeForSearch("perez"))).toBe(
      normalizeForSearch("perez"),
    );
  });
});
