import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mocks.redirect(path);
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

vi.mock("@/app/admin/cambiar-contrasena/actions", () => ({
  changePassword: vi.fn(),
}));

vi.mock("@/components/admin/AdminChangePasswordForm", () => ({
  AdminChangePasswordForm: () => <div data-testid="change-password-form" />,
}));

import CambiarContrasenaPage from "@/app/admin/cambiar-contrasena/page";

describe("CambiarContrasenaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to sign-in", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(CambiarContrasenaPage({})).rejects.toThrow("NEXT_REDIRECT:/auth/signin");

    expect(mocks.redirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("renders the password change form for authenticated users", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "user@alquileresanita.com.ar", isDefaultAdmin: true },
    });

    const jsx = await CambiarContrasenaPage({});
    render(jsx);

    expect(
      screen.getByRole("heading", { name: /cambiar contraseña/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("change-password-form")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /volver al panel/i })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("shows a success banner for ?message=contrasena-actualizada", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "user@alquileresanita.com.ar", isDefaultAdmin: true },
    });

    const jsx = await CambiarContrasenaPage({ searchParams: { message: "contrasena-actualizada" } });
    render(jsx);

    expect(
      screen.getByText(/tu contraseña se actualizó correctamente/i),
    ).toBeInTheDocument();
  });
});
