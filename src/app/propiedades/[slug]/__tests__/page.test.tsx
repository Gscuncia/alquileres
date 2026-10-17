import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PropertyPage, {
  generateStaticParams,
} from "@/app/propiedades/[slug]/page";

const mockGetPropertyBySlug = vi.fn();
const mockGetAllPropertiesForAdmin = vi.fn();

vi.mock("@/lib/properties-db", () => ({
  getPropertyBySlug: (slug: string) => mockGetPropertyBySlug(slug),
  getAllPropertiesForAdmin: () => mockGetAllPropertiesForAdmin(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/propiedades/depto-1",
}));

const dbProperty = {
  id: "prop-1",
  slug: "depto-1",
  title: "Departamento luminoso frente al mar",
  location: "San Clemente del Tuyú, Buenos Aires",
  shortDescription: "Moderno departamento a una cuadra de la playa",
  description:
    "Primer párrafo de la descripción completa.\n\nSegundo párrafo de la descripción completa.",
  capacity: 2,
  bedrooms: 1,
  bathrooms: 1,
  amenities: ["Wi-Fi", "Cocina equipada"],
  images: [
    { url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", fit: "cover", position: "center" },
  ],
  published: true,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PropertyPage", () => {
  it("renders a published property by slug with paragraphs from the description", async () => {
    mockGetPropertyBySlug.mockResolvedValue(dbProperty);

    const { container } = render(
      await PropertyPage({ params: { slug: "depto-1" } }),
    );

    expect(
      screen.getByRole("heading", { name: /departamento luminoso frente al mar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Primer párrafo de la descripción completa."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Segundo párrafo de la descripción completa."),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("p").length).toBeGreaterThanOrEqual(2);
  });

  it("returns 404 for an unknown slug", async () => {
    mockGetPropertyBySlug.mockResolvedValue(null);

    await expect(
      PropertyPage({ params: { slug: "slug-inexistente" } }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("returns 404 for an unpublished slug", async () => {
    mockGetPropertyBySlug.mockResolvedValue(null);

    await expect(
      PropertyPage({ params: { slug: "borrador" } }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("does not render any rating value or star icon", async () => {
    mockGetPropertyBySlug.mockResolvedValue(dbProperty);

    const { container } = render(
      await PropertyPage({ params: { slug: "depto-1" } }),
    );

    expect(screen.queryByText(/anfitrión/i)).not.toBeInTheDocument();
    // StarIcon is the only icon rendered as an svg <polygon>; amenity icons
    // use <path>/<polyline>, so no polygon means no star anywhere.
    expect(container.querySelector("polygon")).toBeNull();
    expect(container.querySelector("polyline")).not.toBeNull();
    expect(mockGetPropertyBySlug).toHaveBeenCalledWith("depto-1");
  });

  it("builds static params from all properties and falls back to empty on db error", async () => {
    mockGetAllPropertiesForAdmin.mockResolvedValue([dbProperty]);

    await expect(generateStaticParams()).resolves.toEqual([{ slug: "depto-1" }]);

    mockGetAllPropertiesForAdmin.mockRejectedValue(new Error("db down"));

    await expect(generateStaticParams()).resolves.toEqual([]);
  });
});
