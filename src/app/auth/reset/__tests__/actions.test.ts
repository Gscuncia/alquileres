import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  passwordResetTokenFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  passwordResetTokenDelete: vi.fn(),
  bcryptHash: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      findUnique: mocks.passwordResetTokenFindUnique,
      delete: mocks.passwordResetTokenDelete,
    },
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
    $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: (password: string, rounds: number) => mocks.bcryptHash(password, rounds),
  },
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mocks.redirect(path);
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

import { resetPassword } from "@/app/auth/reset/actions";
import type { ActionState } from "@/lib/admin-action-types";

const initialState: ActionState = { ok: false };

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    token: "valid-token",
    newPassword: "newSecurePassword123",
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    formData.append(key, value);
  }
  return formData;
}

describe("resetPassword action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.passwordResetTokenFindUnique.mockResolvedValue({
      id: "rt-1",
      email: "user@alquileresanita.com.ar",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    mocks.userFindUnique.mockResolvedValue({ id: "user-1" });
    mocks.bcryptHash.mockResolvedValue("new-hashed-password");
    mocks.userUpdate.mockResolvedValue({});
    mocks.passwordResetTokenDelete.mockResolvedValue({});
  });

  it("rejects a new password shorter than 6 characters", async () => {
    const result = await resetPassword(
      initialState,
      buildFormData({ newPassword: "12345" }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.newPassword).toMatch(/6 caracteres/i);
    expect(mocks.passwordResetTokenFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a missing token", async () => {
    const result = await resetPassword(
      initialState,
      buildFormData({ token: "" }),
    );

    expect(result.ok).toBe(false);
    expect(mocks.passwordResetTokenFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an unknown token", async () => {
    mocks.passwordResetTokenFindUnique.mockResolvedValue(null);

    const result = await resetPassword(initialState, buildFormData());

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/inválido o expiró/i);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    mocks.passwordResetTokenFindUnique.mockResolvedValue({
      id: "rt-1",
      email: "user@alquileresanita.com.ar",
      token: "valid-token",
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await resetPassword(initialState, buildFormData());

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/inválido o expiró/i);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("rejects when the user no longer exists", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const result = await resetPassword(initialState, buildFormData());

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/inválido o expiró/i);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("updates the password, clears mustChangePassword, deletes the token, and redirects to sign-in", async () => {
    await expect(resetPassword(initialState, buildFormData())).rejects.toThrow(
      "NEXT_REDIRECT:/auth/signin",
    );

    expect(mocks.passwordResetTokenFindUnique).toHaveBeenCalledWith({
      where: { token: "valid-token" },
    });
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: "user@alquileresanita.com.ar" },
      select: { id: true },
    });
    expect(mocks.bcryptHash).toHaveBeenCalledWith("newSecurePassword123", 10);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: "new-hashed-password",
        mustChangePassword: false,
      },
    });
    expect(mocks.passwordResetTokenDelete).toHaveBeenCalledWith({
      where: { id: "rt-1" },
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/signin");
  });
});
