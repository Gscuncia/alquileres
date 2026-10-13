import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  passwordResetTokenFindUnique: vi.fn(),
  redirect: vi.fn(),
  ResetPasswordForm: ({ token }: { token: string }) => (
    <div data-testid="reset-form" data-token={token} />
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      findUnique: mocks.passwordResetTokenFindUnique,
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mocks.redirect(path);
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

vi.mock("@/components/auth/reset-password-form", () => ({
  ResetPasswordForm: ({ token }: { token: string }) => mocks.ResetPasswordForm({ token }),
}));

import ResetPage from "@/app/auth/reset/page";

describe("ResetPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /auth/recover when no token is provided", async () => {
    mocks.passwordResetTokenFindUnique.mockResolvedValue(null);

    await expect(ResetPage({ searchParams: {} })).rejects.toThrow(
      "NEXT_REDIRECT:/auth/recover",
    );

    expect(mocks.redirect).toHaveBeenCalledWith("/auth/recover");
    expect(mocks.passwordResetTokenFindUnique).not.toHaveBeenCalled();
  });

  it("shows an error when the token is invalid", async () => {
    mocks.passwordResetTokenFindUnique.mockResolvedValue(null);

    const jsx = await ResetPage({ searchParams: { token: "invalid-token" } });
    render(jsx);

    expect(
      screen.getByRole("heading", { name: /enlace inválido/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/inválido o expiró/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /solicitar un nuevo enlace/i }),
    ).toHaveAttribute("href", "/auth/recover");
  });

  it("shows an error when the token is expired", async () => {
    mocks.passwordResetTokenFindUnique.mockResolvedValue({
      id: "rt-1",
      email: "user@alquileresanita.com.ar",
      token: "expired-token",
      expiresAt: new Date(Date.now() - 1000),
    });

    const jsx = await ResetPage({ searchParams: { token: "expired-token" } });
    render(jsx);

    expect(
      screen.getByRole("heading", { name: /enlace inválido/i }),
    ).toBeInTheDocument();
  });

  it("renders the reset form for a valid token", async () => {
    mocks.passwordResetTokenFindUnique.mockResolvedValue({
      id: "rt-1",
      email: "user@alquileresanita.com.ar",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const jsx = await ResetPage({ searchParams: { token: "valid-token" } });
    render(jsx);

    expect(
      screen.getByRole("heading", { name: /nueva contraseña/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("reset-form")).toHaveAttribute(
      "data-token",
      "valid-token",
    );
  });
});
