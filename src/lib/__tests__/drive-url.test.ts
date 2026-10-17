import { describe, it, expect } from "vitest";
import {
  DRIVE_THUMBNAIL_SIZE,
  extractDriveFileId,
  toDirectDriveUrl,
} from "@/lib/drive-url";

const ID = "1AbC_dEf-1234567890";

const DRIVE_FORMATS: Array<[string, string]> = [
  ["file view link", `https://drive.google.com/file/d/${ID}/view?usp=sharing`],
  ["file preview link", `https://drive.google.com/file/d/${ID}/preview`],
  ["open?id link", `https://drive.google.com/open?id=${ID}`],
  ["uc?id link with export param", `https://drive.google.com/uc?id=${ID}&export=view`],
  ["uc?id with id after other params", `https://drive.google.com/uc?export=download&id=${ID}`],
  ["thumbnail link without sz", `https://drive.google.com/thumbnail?id=${ID}`],
  ["thumbnail link with sz", `https://drive.google.com/thumbnail?id=${ID}&sz=w400`],
];

describe("extractDriveFileId", () => {
  it.each(DRIVE_FORMATS)("extracts the id from a %s", (_name, url) => {
    expect(extractDriveFileId(url)).toBe(ID);
  });

  it("returns null for a non-Drive URL", () => {
    expect(
      extractDriveFileId("https://images.unsplash.com/photo-1502672260266"),
    ).toBeNull();
  });

  it("returns null for plain text", () => {
    expect(extractDriveFileId("no es una url")).toBeNull();
  });
});

describe("toDirectDriveUrl", () => {
  it("exposes w1200 as the canonical thumbnail size", () => {
    expect(DRIVE_THUMBNAIL_SIZE).toBe("w1200");
  });

  it.each(DRIVE_FORMATS)(
    "normalizes a %s to the direct thumbnail URL",
    (_name, url) => {
      expect(toDirectDriveUrl(url)).toBe(
        `https://drive.google.com/thumbnail?id=${ID}&sz=w1200`,
      );
    },
  );

  it("upgrades an already-canonical thumbnail link with sz=w400 to sz=w1200", () => {
    expect(toDirectDriveUrl(`https://drive.google.com/thumbnail?id=${ID}&sz=w400`)).toBe(
      `https://drive.google.com/thumbnail?id=${ID}&sz=w1200`,
    );
  });

  it("returns a non-Drive URL unchanged (trimmed only)", () => {
    const url = "  https://images.unsplash.com/photo-1502672260266  ";
    expect(toDirectDriveUrl(url)).toBe(
      "https://images.unsplash.com/photo-1502672260266",
    );
  });

  it("returns an empty string for empty or whitespace-only input", () => {
    expect(toDirectDriveUrl("")).toBe("");
    expect(toDirectDriveUrl("   ")).toBe("");
  });

  it("is idempotent for Drive links", () => {
    const once = toDirectDriveUrl(`https://drive.google.com/file/d/${ID}/view`);
    expect(toDirectDriveUrl(once)).toBe(once);
  });

  it("is idempotent for non-Drive links", () => {
    const once = toDirectDriveUrl("https://example.com/foto.jpg");
    expect(toDirectDriveUrl(once)).toBe(once);
  });
});
