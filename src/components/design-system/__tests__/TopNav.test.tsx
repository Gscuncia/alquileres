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
  it("renders a top-right Login link to /auth/signin", () => {
    render(<TopNav />);

    const login = screen.getByRole("link", { name: /login/i });
    expect(login).toBeInTheDocument();
    expect(login).toHaveAttribute("href", "/auth/signin");
  });

  it("still renders public navigation items", () => {
    render(<TopNav />);

    for (const label of ["Alojamiento", "Quienes somos", "Contacto"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});
