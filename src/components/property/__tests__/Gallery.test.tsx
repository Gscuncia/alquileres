import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Gallery } from "@/components/property/Gallery";

const images = Array.from({ length: 10 }, (_, i) => `https://img.example/${i}.jpg`);

describe("Gallery", () => {
  it("renders the cover as the main image and thumbnails for every photo", () => {
    render(<Gallery images={images} alt="Depto 1" />);

    expect(screen.getByRole("img", { name: "Depto 1" })).toHaveAttribute(
      "src",
      images[0],
    );
    // jsdom ignores responsive CSS: the desktop grid (photos 2-10) and the
    // mobile strip (photos 1-10) both render. Assert the label union instead.
    const labels = new Set(
      screen
        .getAllByRole("button", { name: /ver foto/i })
        .map((button) => button.getAttribute("aria-label")),
    );
    expect(labels).toContain("Ver foto 1");
    expect(labels).toContain("Ver foto 10");
  });

  it("shows a back-to-cover button after selecting another photo and resets with it", () => {
    render(<Gallery images={images} alt="Depto 1" />);

    expect(screen.queryByRole("button", { name: /volver a la foto de portada/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Ver foto 2" })[0]);
    expect(
      screen.getByRole("button", { name: /volver a la foto de portada/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /volver a la foto de portada/i }),
    );
    expect(
      screen.queryByRole("button", { name: /volver a la foto de portada/i }),
    ).not.toBeInTheDocument();
  });
});
