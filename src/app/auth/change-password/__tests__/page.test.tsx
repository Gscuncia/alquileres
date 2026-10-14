import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
  },
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

vi.mock("@/components/auth/change-password-form", () => ({
  ChangePasswordForm: () => <div data-testid="change-password-form" />,
}));

import ChangePasswordPage from "@/app/auth/change-password/page";

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue({ mustChangePassword: false });
  });

  it("redirects unauthenticated users to sign-in", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(ChangePasswordPage()).rejects.toThrow("NEXT_REDIRECT:/auth/signin");

    expect(mocks.redirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("redirects users who do not need to change password to /admin", async () => {
    mocks.userFindUnique.mockResolvedValue({ mustChangePassword: false });
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", mustChangePassword: true },
    });

    await expect(ChangePasswordPage()).rejects.toThrow("NEXT_REDIRECT:/admin");

    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });

  it("renders the change password form for users that must change password", async () => {
    mocks.userFindUnique.mockResolvedValue({ mustChangePassword: true });
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", mustChangePassword: true },
    });

    const jsx = await ChangePasswordPage();
    render(jsx);

    expect(
      screen.getByRole("heading", { name: /cambiar contraseña/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("change-password-form")).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
