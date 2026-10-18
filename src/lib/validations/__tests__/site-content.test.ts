import { describe, it, expect } from "vitest";
import {
  aboutSchema,
  whatToDoSchema,
  locationSchema,
  collectSiteContentFieldErrors,
} from "@/lib/validations/site-content";

describe("aboutSchema", () => {
  it("accepts a valid submission and applies image entry defaults", () => {
    const parsed = aboutSchema.safeParse({
      intro: "Una familia en la costa",
      body: "Primer párrafo.\n\nSegundo párrafo.",
      images: [{ url: "https://example.com/casa.jpg" }],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.images).toEqual([
        {
          url: "https://example.com/casa.jpg",
          fit: "cover",
          x: 50,
          y: 50,
          zoom: 1,
        },
      ]);
    }
  });

  it("defaults images to an empty list when absent", () => {
    const parsed = aboutSchema.safeParse({ intro: "", body: "" });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.images).toEqual([]);
    }
  });

  it("rejects more than six images", () => {
    const images = Array.from({ length: 7 }, (_, index) => ({
      url: `https://example.com/${index}.jpg`,
    }));

    const parsed = aboutSchema.safeParse({ intro: "", body: "", images });

    expect(parsed.success).toBe(false);
  });

  it("rejects non-URL image entries", () => {
    const parsed = aboutSchema.safeParse({
      intro: "",
      body: "",
      images: [{ url: "no-es-url" }],
    });

    expect(parsed.success).toBe(false);
  });
});

describe("whatToDoSchema", () => {
  it("accepts a valid cards list with image defaults", () => {
    const parsed = whatToDoSchema.safeParse({
      intro: "Planes en San Clemente",
      cards: [
        {
          title: "Playa",
          description: "Arena dorada.",
          image: { url: "https://example.com/playa.jpg" },
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cards[0].image).toMatchObject({
        url: "https://example.com/playa.jpg",
        fit: "cover",
        x: 50,
        y: 50,
        zoom: 1,
      });
    }
  });

  it("defaults cards to an empty list when absent", () => {
    const parsed = whatToDoSchema.safeParse({ intro: "" });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cards).toEqual([]);
    }
  });

  it("flags a missing card title at the cards path", () => {
    const parsed = whatToDoSchema.safeParse({
      intro: "",
      cards: [{ title: "", description: "Desc", image: { url: "https://example.com/i.jpg" } }],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["cards", 0, "title"]);
      const fieldErrors = collectSiteContentFieldErrors(parsed.error);
      expect(fieldErrors.cards).toContain(
        "El título del cuadro es obligatorio.",
      );
    }
  });

  it("flags an empty card image url", () => {
    const parsed = whatToDoSchema.safeParse({
      intro: "",
      cards: [{ title: "T", description: "D", image: { url: "" } }],
    });

    expect(parsed.success).toBe(false);
  });

  it("aggregates several card issues under the cards key", () => {
    const parsed = whatToDoSchema.safeParse({
      intro: "",
      cards: [
        { title: "", description: "", image: { url: "" } },
        { title: "Otro", description: "", image: { url: "" } },
      ],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const fieldErrors = collectSiteContentFieldErrors(parsed.error);
      expect(fieldErrors.cards).toContain("; ");
      expect(fieldErrors.intro).toBeUndefined();
    }
  });
});

describe("locationSchema", () => {
  it("accepts a valid address and body", () => {
    const parsed = locationSchema.safeParse({
      address: "Calle 4 entre 15 y 16",
      body: "Primer párrafo.\n\nSegundo párrafo.",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        address: "Calle 4 entre 15 y 16",
        body: "Primer párrafo.\n\nSegundo párrafo.",
      });
    }
  });

  it("rejects an empty address with the expected message", () => {
    const parsed = locationSchema.safeParse({ address: "   ", body: "" });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const fieldErrors = collectSiteContentFieldErrors(parsed.error);
      expect(fieldErrors.address).toBe("La dirección es obligatoria.");
    }
  });

  it("allows an empty body", () => {
    const parsed = locationSchema.safeParse({
      address: "Calle 4",
      body: "",
    });

    expect(parsed.success).toBe(true);
  });
});
