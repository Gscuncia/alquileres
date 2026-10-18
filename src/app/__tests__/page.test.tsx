import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "@/app/page";

const mockGetPublishedProperties = vi.fn();
const mockGetLocationContent = vi.fn();

vi.mock("@/lib/properties-db", () => ({
  getPublishedProperties: () => mockGetPublishedProperties(),
}));

vi.mock("@/lib/site-content", () => ({
  getLocationContent: () => mockGetLocationContent(),
}));

describe("LandingPage", () => {
  beforeEach(() => {
    mockGetLocationContent.mockResolvedValue({
      address: "Calle 4 entre 15 y 16, San Clemente de Tuyú",
      paragraphs: [],
    });
  });

  it("renders published properties from the database", async () => {
    mockGetPublishedProperties.mockResolvedValue([
      {
        id: "prop-1",
        slug: "depto-1",
        title: "Departamento luminoso frente al mar",
        location: "San Clemente del Tuyú, Buenos Aires",
        shortDescription: "Moderno departamento a una cuadra de la playa",
        images: [
          { url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", fit: "cover", position: "center" },
        ],
      },
      {
        id: "prop-2",
        slug: "chalet",
        title: "Chalet amplio a cinco cuadras del mar",
        location: "San Clemente del Tuyú, Buenos Aires",
        shortDescription: "Chalet de tres dormitorios con jardín",
        images: [
          { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", fit: "cover", position: "center" },
        ],
      },
    ]);

    render(await LandingPage());

    expect(screen.getByText("Departamento luminoso frente al mar")).toBeInTheDocument();
    expect(screen.getByText("Chalet amplio a cinco cuadras del mar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /depto-1|departamento luminoso/i })).toHaveAttribute(
      "href",
      "/propiedades/depto-1",
    );
  });

  it("renders safely when the database has no published properties", async () => {
    mockGetPublishedProperties.mockResolvedValue([]);

    const { container } = render(await LandingPage());

    expect(screen.getByRole("heading", { name: /elegí tu próximo alojamiento/i })).toBeInTheDocument();
    // GoogleReviews renders <article> elements too; property cards are the
    // only ones with the "group relative" classes.
    expect(container.querySelectorAll("article.group")).toHaveLength(0);
  });
});
