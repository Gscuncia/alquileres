import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminDashboardPage from "@/app/admin/page";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

describe("AdminDashboardPage", () => {
  it("renders dashboard for an authenticated admin", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "admin@alquileresanita.com.ar",
        role: "ADMIN",
      },
    });

    render(await AdminDashboardPage());

    expect(
      screen.getByRole("heading", { name: /panel de administración/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/bienvenido, admin@alquileresanita.com.ar./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/rol: admin/i)).toBeInTheDocument();
  });
});
