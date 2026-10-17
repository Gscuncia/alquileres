import { describe, it, expect } from "vitest";
import {
  imageStyle,
  normalizeImage,
  normalizeImages,
  type PropertyImage,
} from "@/lib/image-framing";

const URL_A = "https://img.example/a.jpg";

describe("normalizeImage", () => {
  it("accepts a framed object keeping its fit and focus", () => {
    expect(
      normalizeImage({ url: URL_A, fit: "contain", x: 25, y: 75, zoom: 1.5 }),
    ).toEqual({
      url: URL_A,
      fit: "contain",
      x: 25,
      y: 75,
      zoom: 1.5,
    });
  });

  it("falls back to defaults on invalid fit, focus or zoom", () => {
    expect(
      normalizeImage({
        url: URL_A,
        fit: "stretch",
        x: "left",
        y: null,
        zoom: "big",
      }),
    ).toEqual({ url: URL_A, fit: "cover", x: 50, y: 50, zoom: 1 });
    expect(
      normalizeImage({ url: URL_A, fit: 1, x: 10, y: 20, zoom: 2 }),
    ).toEqual({ url: URL_A, fit: "cover", x: 10, y: 20, zoom: 2 });
  });

  it("clamps x/y to 0..100 and zoom to 0.5..3", () => {
    expect(
      normalizeImage({ url: URL_A, x: -20, y: 180, zoom: 99 }),
    ).toEqual({ url: URL_A, fit: "cover", x: 0, y: 100, zoom: 3 });
    expect(
      normalizeImage({ url: URL_A, x: 60, y: 40, zoom: 0.1 }),
    ).toEqual({ url: URL_A, fit: "cover", x: 60, y: 40, zoom: 0.5 });
  });

  it("trims the URL", () => {
    expect(normalizeImage({ url: `  ${URL_A}  `, fit: "contain" })).toMatchObject({
      url: URL_A,
      fit: "contain",
    });
  });

  it("accepts a legacy plain-string URL as cover/center", () => {
    expect(normalizeImage(URL_A)).toEqual({
      url: URL_A,
      fit: "cover",
      x: 50,
      y: 50,
      zoom: 1,
    });
  });

  it("maps every legacy position preset to its focus percentages", () => {
    const presets: Array<[string, number, number]> = [
      ["top-left", 0, 0],
      ["top", 50, 0],
      ["top-right", 100, 0],
      ["left", 0, 50],
      ["center", 50, 50],
      ["right", 100, 50],
      ["bottom-left", 0, 100],
      ["bottom", 50, 100],
      ["bottom-right", 100, 100],
    ];
    for (const [position, x, y] of presets) {
      expect(normalizeImage({ url: URL_A, position })).toEqual({
        url: URL_A,
        fit: "cover",
        x,
        y,
        zoom: 1,
      });
    }
  });

  it("prefers explicit x/y over a legacy position preset", () => {
    expect(
      normalizeImage({ url: URL_A, position: "top-left", x: 80, y: 20 }),
    ).toEqual({ url: URL_A, fit: "cover", x: 80, y: 20, zoom: 1 });
  });

  it("returns null for unusable entries", () => {
    expect(normalizeImage("")).toBeNull();
    expect(normalizeImage("   ")).toBeNull();
    expect(normalizeImage(null)).toBeNull();
    expect(normalizeImage(42)).toBeNull();
    expect(normalizeImage([URL_A])).toBeNull();
    expect(normalizeImage({ fit: "cover", x: 50, y: 50 })).toBeNull();
    expect(normalizeImage({ url: "   " })).toBeNull();
  });
});

describe("normalizeImages", () => {
  it("normalizes a mixed list and keeps order", () => {
    expect(
      normalizeImages([
        "https://img.example/legacy.jpg",
        { url: "https://img.example/framed.jpg", fit: "contain", x: 10, y: 90, zoom: 2 },
        { url: "https://img.example/preset.jpg", fit: "cover", position: "bottom" },
      ]),
    ).toEqual([
      { url: "https://img.example/legacy.jpg", fit: "cover", x: 50, y: 50, zoom: 1 },
      { url: "https://img.example/framed.jpg", fit: "contain", x: 10, y: 90, zoom: 2 },
      { url: "https://img.example/preset.jpg", fit: "cover", x: 50, y: 100, zoom: 1 },
    ]);
  });

  it("filters junk entries", () => {
    expect(
      normalizeImages([null, 42, {}, { url: "" }, URL_A]),
    ).toEqual([{ url: URL_A, fit: "cover", x: 50, y: 50, zoom: 1 }]);
  });

  it("returns an empty array for non-array input", () => {
    expect(normalizeImages(undefined)).toEqual([]);
    expect(normalizeImages(null)).toEqual([]);
    expect(normalizeImages(URL_A)).toEqual([]);
    expect(normalizeImages({})).toEqual([]);
  });
});

describe("imageStyle", () => {
  const styleFor = (
    framing: Partial<PropertyImage> = {},
    fit: PropertyImage["fit"] = "cover",
  ) => imageStyle({ url: URL_A, fit, x: 50, y: 50, zoom: 1, ...framing });

  it("anchors the element so the focal point sits at (x%, y%) of the box", () => {
    expect(styleFor({ x: 0, y: 0 })).toEqual({
      position: "absolute",
      left: "0%",
      top: "0%",
      width: "100%",
      height: "100%",
      transform: "translate(-0%, -0%)",
      objectFit: "cover",
      objectPosition: "50% 50%",
    });
    expect(styleFor({ x: 75, y: 25 })).toMatchObject({
      left: "75%",
      top: "25%",
      transform: "translate(-75%, -25%)",
    });
  });

  it("oversizes the element by zoom so the box always stays covered", () => {
    expect(styleFor({ zoom: 2 })).toMatchObject({
      width: "200%",
      height: "200%",
      objectFit: "cover",
    });
    expect(styleFor({ zoom: 1 })).toMatchObject({
      width: "100%",
      height: "100%",
    });
    // Legacy stored zooms below 1 clamp up so the box never underfills.
    expect(styleFor({ zoom: 0.5 })).toMatchObject({
      width: "100%",
      height: "100%",
    });
  });

  it("renders contain as a fully visible, centered element", () => {
    expect(styleFor({}, "contain")).toEqual({
      position: "absolute",
      left: "50%",
      top: "50%",
      width: "100%",
      height: "100%",
      transform: "translate(-50%, -50%)",
      objectFit: "contain",
      objectPosition: "50% 50%",
    });
  });
});
