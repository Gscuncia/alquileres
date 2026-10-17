import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Gallery } from "@/components/property/Gallery";
import type { PropertyImage } from "@/lib/image-framing";

const images: PropertyImage[] = Array.from(
  { length: 10 },
  (_, i): PropertyImage => ({
    url: `https://img.example/${i}.jpg`,
    fit: "cover",
    x: 50,
    y: 50,
    zoom: 1,
  }),
);

describe("Gallery", () => {
  it("renders the cover as the main image and thumbnails for every photo", () => {
    render(<Gallery images={images} alt="Depto 1" />);

    expect(screen.getByRole("img", { name: "Depto 1" })).toHaveAttribute(
      "src",
      images[0].url,
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

  it("lets the user select the cover photo again from its thumbnail", () => {
    render(<Gallery images={images} alt="Depto 1" />);

    fireEvent.click(screen.getAllByRole("button", { name: "Ver foto 2" })[0]);
    expect(screen.getByRole("img", { name: "Depto 1" })).toHaveAttribute(
      "src",
      images[1].url,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Ver foto 1" })[0]);
    expect(screen.getByRole("img", { name: "Depto 1" })).toHaveAttribute(
      "src",
      images[0].url,
    );
  });

  it("applies the framing style to the main image and thumbnails", () => {
    const framed: PropertyImage[] = [
      { url: "https://img.example/main.jpg", fit: "contain", x: 50, y: 0, zoom: 1 },
      { url: "https://img.example/thumb.jpg", fit: "cover", x: 100, y: 100, zoom: 1 },
      ...images.slice(2),
    ];
    render(<Gallery images={framed} alt="Depto 1" />);

    const main = screen.getByRole("img", { name: "Depto 1" });
    expect(main).toHaveStyle({
      objectFit: "contain",
      left: "50%",
      top: "0%",
      transform: "translate(-50%, -0%)",
    });

    // Both the desktop grid and the mobile strip render in jsdom.
    const thumbnail = screen.getAllByAltText("Depto 1 - foto 2")[0];
    expect(thumbnail).toHaveStyle({
      objectFit: "cover",
      left: "100%",
      top: "100%",
      transform: "translate(-100%, -100%)",
    });
  });

  it("keeps the box covered while zoomed and pans via element geometry", () => {
    const framed: PropertyImage[] = [
      { url: "https://img.example/main.jpg", fit: "cover", x: 30, y: 40, zoom: 2 },
      ...images.slice(1),
    ];
    render(<Gallery images={framed} alt="Depto 1" />);

    const main = screen.getByRole("img", { name: "Depto 1" });
    expect(main).toHaveStyle({
      position: "absolute",
      width: "200%",
      height: "200%",
      left: "30%",
      top: "40%",
      transform: "translate(-30%, -40%)",
      objectFit: "cover",
    });
  });
});
