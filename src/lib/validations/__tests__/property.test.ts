import { describe, it, expect } from "vitest";
import { propertySchema } from "@/lib/validations/property";

const validProperty = {
  title: "Departamento luminoso frente al mar",
  slug: "depto-1",
  location: "San Clemente del Tuyú, Buenos Aires",
  shortDescription: "Moderno departamento a una cuadra de la playa",
  description: "Primer párrafo.\n\nSegundo párrafo.",
  capacity: 2,
  bedrooms: 1,
  bathrooms: 1,
  amenities: ["Wi-Fi", "Cocina equipada"],
  images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"],
  sortOrder: 1,
};

describe("propertySchema", () => {
  it("accepts valid data and defaults published to true", () => {
    const result = propertySchema.safeParse(validProperty);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.published).toBe(true);
    }
  });

  it("rejects a non-URL image naming the field", () => {
    const result = propertySchema.safeParse({
      ...validProperty,
      images: ["not-a-url"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const imageErrors = result.error.issues.filter(
        (issue) => issue.path[0] === "images",
      );
      expect(imageErrors.length).toBeGreaterThan(0);
      expect(imageErrors[0].message).toMatch(/URL válida/i);
    }
  });

  it("rejects an image whose scheme is not http/https", () => {
    const result = propertySchema.safeParse({
      ...validProperty,
      images: ["ftp://images.example.com/photo.jpg"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const imageErrors = result.error.issues.filter(
        (issue) => issue.path[0] === "images",
      );
      expect(imageErrors[0].message).toMatch(/URL válida/i);
    }
  });

  it("names the missing required field in the error message", () => {
    const { title: _title, ...missingTitle } = validProperty;
    const result = propertySchema.safeParse(missingTitle);

    expect(result.success).toBe(false);
    if (!result.success) {
      const titleErrors = result.error.issues.filter(
        (issue) => issue.path[0] === "title",
      );
      expect(titleErrors.length).toBeGreaterThan(0);
      expect(titleErrors[0].message).toMatch(/título/i);
    }
  });

  it("rejects capacity 0", () => {
    const result = propertySchema.safeParse({ ...validProperty, capacity: 0 });

    expect(result.success).toBe(false);
    if (!result.success) {
      const capacityErrors = result.error.issues.filter(
        (issue) => issue.path[0] === "capacity",
      );
      expect(capacityErrors[0].message).toMatch(/capacidad/i);
    }
  });

  it("rejects negative bedrooms", () => {
    const result = propertySchema.safeParse({ ...validProperty, bedrooms: -1 });

    expect(result.success).toBe(false);
  });

  it("rejects a slug with uppercase letters or spaces", () => {
    const result = propertySchema.safeParse({
      ...validProperty,
      slug: "Depto Uno",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const slugErrors = result.error.issues.filter(
        (issue) => issue.path[0] === "slug",
      );
      expect(slugErrors[0].message).toMatch(/slug/i);
    }
  });

  it("rejects a negative sortOrder", () => {
    const result = propertySchema.safeParse({ ...validProperty, sortOrder: -3 });

    expect(result.success).toBe(false);
  });

  it("allows empty amenities and images lists", () => {
    const result = propertySchema.safeParse({
      ...validProperty,
      amenities: [],
      images: [],
    });

    expect(result.success).toBe(true);
  });
});
