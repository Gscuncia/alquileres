import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopNav } from "@/components/design-system/TopNav";

const mockUsePathname = vi.fn(() => "/");

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

describe("TopNav", () => {
  it("does not render any Login link in the header", () => {
    render(<TopNav />);

    expect(screen.queryByRole("link", { name: /login/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /auth\/signin/i })).not.toBeInTheDocument();
  });

  it("still renders public navigation items", () => {
    render(<TopNav />);

    for (const label of ["Alojamiento", "Quienes somos", "Contacto"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});
