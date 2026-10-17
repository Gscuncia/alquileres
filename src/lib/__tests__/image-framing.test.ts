import { describe, it, expect } from "vitest";
import {
  imageStyle,
  normalizeImage,
  normalizeImages,
  type PropertyImage,
} from "@/lib/image-framing";

describe("normalizeImage", () => {
  it("accepts a framed object keeping its fit and position", () => {
    expect(normalizeImage({ url: "https://img.example/a.jpg", fit: "contain", position: "top-left" })).toEqual({
      url: "https://img.example/a.jpg",
      fit: "contain",
      position: "top-left",
    });
  });

  it("falls back to defaults on invalid fit or position", () => {
    expect(normalizeImage({ url: "https://img.example/a.jpg", fit: "stretch", position: "diagonal" })).toEqual({
      url: "https://img.example/a.jpg",
      fit: "cover",
      position: "center",
    });
    expect(normalizeImage({ url: "https://img.example/a.jpg", fit: 1, position: null })).toEqual({
      url: "https://img.example/a.jpg",
      fit: "cover",
      position: "center",
    });
  });

  it("trims the URL", () => {
    expect(normalizeImage({ url: "  https://img.example/a.jpg  ", fit: "contain" })).toMatchObject({
      url: "https://img.example/a.jpg",
      fit: "contain",
      position: "center",
    });
  });

  it("accepts a legacy plain-string URL as cover/center", () => {
    expect(normalizeImage("https://img.example/a.jpg")).toEqual({
      url: "https://img.example/a.jpg",
      fit: "cover",
      position: "center",
    });
  });

  it("returns null for unusable entries", () => {
    expect(normalizeImage("")).toBeNull();
    expect(normalizeImage("   ")).toBeNull();
    expect(normalizeImage(null)).toBeNull();
    expect(normalizeImage(42)).toBeNull();
    expect(normalizeImage(["https://img.example/a.jpg"])).toBeNull();
    expect(normalizeImage({ fit: "cover", position: "center" })).toBeNull();
    expect(normalizeImage({ url: "   " })).toBeNull();
  });
});

describe("normalizeImages", () => {
  it("normalizes a mixed list and keeps order", () => {
    expect(
      normalizeImages([
        "https://img.example/legacy.jpg",
        { url: "https://img.example/framed.jpg", fit: "contain", position: "top" },
      ]),
    ).toEqual([
      { url: "https://img.example/legacy.jpg", fit: "cover", position: "center" },
      { url: "https://img.example/framed.jpg", fit: "contain", position: "top" },
    ]);
  });

  it("filters junk entries", () => {
    expect(
      normalizeImages([null, 42, {}, { url: "" }, "https://img.example/a.jpg"]),
    ).toEqual([{ url: "https://img.example/a.jpg", fit: "cover", position: "center" }]);
  });

  it("returns an empty array for non-array input", () => {
    expect(normalizeImages(undefined)).toEqual([]);
    expect(normalizeImages(null)).toEqual([]);
    expect(normalizeImages("https://img.example/a.jpg")).toEqual([]);
    expect(normalizeImages({})).toEqual([]);
  });
});

describe("imageStyle", () => {
  const styleFor = (position: PropertyImage["position"], fit: PropertyImage["fit"] = "cover") =>
    imageStyle({ url: "https://img.example/a.jpg", fit, position });

  it("maps all nine positions to objectPosition percentages", () => {
    expect(styleFor("top-left")).toEqual({ objectFit: "cover", objectPosition: "0% 0%" });
    expect(styleFor("top")).toEqual({ objectFit: "cover", objectPosition: "50% 0%" });
    expect(styleFor("top-right")).toEqual({ objectFit: "cover", objectPosition: "100% 0%" });
    expect(styleFor("left")).toEqual({ objectFit: "cover", objectPosition: "0% 50%" });
    expect(styleFor("center")).toEqual({ objectFit: "cover", objectPosition: "50% 50%" });
    expect(styleFor("right")).toEqual({ objectFit: "cover", objectPosition: "100% 50%" });
    expect(styleFor("bottom-left")).toEqual({ objectFit: "cover", objectPosition: "0% 100%" });
    expect(styleFor("bottom")).toEqual({ objectFit: "cover", objectPosition: "50% 100%" });
    expect(styleFor("bottom-right")).toEqual({ objectFit: "cover", objectPosition: "100% 100%" });
  });

  it("applies contain as objectFit", () => {
    expect(styleFor("center", "contain")).toEqual({
      objectFit: "contain",
      objectPosition: "50% 50%",
    });
  });
});
