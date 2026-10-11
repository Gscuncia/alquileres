import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminLayout from "@/app/admin/layout";

const mockAuth = vi.fn();
const mockRedirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
);

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

vi.mock("@/components/auth/signout-button", () => ({
  SignOutButton: () => <button type="button">Cerrar sesión</button>,
}));

describe("AdminLayout", () => {
  it("renders navigation, user info, and logout for an authenticated admin", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "admin@alquileresanita.com.ar",
        role: "ADMIN",
      },
    });

    render(await AdminLayout({ children: <div>Dashboard content</div> }));

    expect(screen.getByRole("heading", { name: /admin/i })).toBeInTheDocument();
    expect(
      screen.getByText(/admin@alquileresanita.com.ar · admin/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/dashboard content/i)).toBeInTheDocument();
  });

  it("redirects unauthenticated users to sign-in", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      AdminLayout({ children: <div>Dashboard content</div> }),
    ).rejects.toThrow("NEXT_REDIRECT /auth/signin");

    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });
});
