import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    property: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
    },
  },
}));

import {
  getPublishedProperties,
  getPropertyBySlug,
  getAllPropertiesForAdmin,
} from "@/lib/properties-db";

const dbProperty = {
  id: "prop-1",
  slug: "depto-1",
  title: "Departamento luminoso frente al mar",
  location: "San Clemente del Tuyú, Buenos Aires",
  shortDescription: "Moderno departamento a una cuadra de la playa",
  description:
    "Primer párrafo de la descripción.\n\nSegundo párrafo de la descripción.",
  capacity: 2,
  bedrooms: 1,
  bathrooms: 1,
  amenities: ["Wi-Fi", "Cocina equipada"],
  images: [
    { url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", fit: "cover", x: 50, y: 50, zoom: 1 },
  ],
  published: true,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("properties-db", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPublishedProperties", () => {
    it("returns only published properties ordered by sortOrder", async () => {
      mocks.findMany.mockResolvedValue([dbProperty]);

      const result = await getPublishedProperties();

      expect(mocks.findMany).toHaveBeenCalledWith({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "prop-1",
        slug: "depto-1",
        title: "Departamento luminoso frente al mar",
        location: "San Clemente del Tuyú, Buenos Aires",
        shortDescription: "Moderno departamento a una cuadra de la playa",
        images: dbProperty.images,
      });
      expect(result[0]).not.toHaveProperty("description");
    });

    it("returns an empty list when the database is unreachable", async () => {
      mocks.findMany.mockRejectedValue(new Error("connection refused"));

      await expect(getPublishedProperties()).resolves.toEqual([]);
    });

    it("wraps legacy plain-string image URLs into framed entries", async () => {
      mocks.findMany.mockResolvedValue([
        {
          ...dbProperty,
          images: ["https://images.unsplash.com/legacy.jpg"],
        },
      ]);

      const result = await getPublishedProperties();

      expect(result[0].images).toEqual([
        {
          url: "https://images.unsplash.com/legacy.jpg",
          fit: "cover",
          x: 50,
          y: 50,
          zoom: 1,
        },
      ]);
    });
  });

  describe("getPropertyBySlug", () => {
    it("returns the full detail for a published slug", async () => {
      mocks.findUnique.mockResolvedValue(dbProperty);

      const result = await getPropertyBySlug("depto-1");

      expect(mocks.findUnique).toHaveBeenCalledWith({ where: { slug: "depto-1" } });
      expect(result?.description).toBe(dbProperty.description);
      expect(result?.capacity).toBe(2);
    });

    it("returns null for an unpublished property", async () => {
      mocks.findUnique.mockResolvedValue({ ...dbProperty, published: false });

      await expect(getPropertyBySlug("depto-1")).resolves.toBeNull();
    });

    it("returns null for an unknown slug", async () => {
      mocks.findUnique.mockResolvedValue(null);

      await expect(getPropertyBySlug("slug-inexistente")).resolves.toBeNull();
    });
  });

  describe("getAllPropertiesForAdmin", () => {
    it("returns every property including unpublished ones", async () => {
      mocks.findMany.mockResolvedValue([dbProperty, { ...dbProperty, id: "prop-2", slug: "borrador", published: false }]);

      const result = await getAllPropertiesForAdmin();

      expect(mocks.findMany).toHaveBeenCalledWith({ orderBy: { sortOrder: "asc" } });
      expect(result).toHaveLength(2);
    });
  });
});
