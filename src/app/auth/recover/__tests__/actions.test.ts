import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  randomBytes: vi.fn(),
  userFindUnique: vi.fn(),
  passwordResetTokenDeleteMany: vi.fn(),
  passwordResetTokenCreate: vi.fn(),
  sendResetEmail: vi.fn(),
}));

vi.mock("node:crypto", () => ({
  default: { randomBytes: mocks.randomBytes },
  randomBytes: mocks.randomBytes,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    passwordResetToken: {
      deleteMany: mocks.passwordResetTokenDeleteMany,
      create: mocks.passwordResetTokenCreate,
    },
  },
}));

vi.mock("@/lib/mail", () => ({
  sendResetEmail: (...args: [string, string, string]) => mocks.sendResetEmail(...args),
}));

import { requestPasswordReset } from "@/app/auth/recover/actions";
import type { ActionState } from "@/lib/admin-action-types";

const initialState: ActionState = { ok: false };

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    email: "user@alquileresanita.com.ar",
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    formData.append(key, value);
  }
  return formData;
}

describe("requestPasswordReset action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.randomBytes.mockImplementation((size: number) => Buffer.alloc(size, 0xab));
    mocks.userFindUnique.mockResolvedValue({
      email: "user@alquileresanita.com.ar",
    });
    mocks.passwordResetTokenDeleteMany.mockResolvedValue({ count: 0 });
    mocks.passwordResetTokenCreate.mockResolvedValue({});
    mocks.sendResetEmail.mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_SITE_URL = "https://alquileresanita.com.ar";
  });

  it("rejects an invalid email with a Spanish field error", async () => {
    const result = await requestPasswordReset(initialState, buildFormData({ email: "not-an-email" }));

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.email).toMatch(/email/i);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("returns a generic success message when the email is not registered", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const result = await requestPasswordReset(initialState, buildFormData());

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/Si el email está registrado/i);
    expect(mocks.passwordResetTokenCreate).not.toHaveBeenCalled();
    expect(mocks.sendResetEmail).not.toHaveBeenCalled();
  });

  it("creates a single-use expiring token and sends a reset email", async () => {
    const result = await requestPasswordReset(initialState, buildFormData());

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/Si el email está registrado/i);

    expect(mocks.passwordResetTokenDeleteMany).toHaveBeenCalledWith({
      where: { email: "user@alquileresanita.com.ar" },
    });

    expect(mocks.passwordResetTokenCreate).toHaveBeenCalledWith({
      data: {
        email: "user@alquileresanita.com.ar",
        token: expect.any(String),
        expiresAt: expect.any(Date),
      },
    });

    const createdToken = mocks.passwordResetTokenCreate.mock.calls[0][0].data.token;
    expect(createdToken).toHaveLength(64);
    expect(createdToken).toMatch(/^[a-f0-9]+$/);

    const expiresAt: Date = mocks.passwordResetTokenCreate.mock.calls[0][0].data.expiresAt;
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(expiresAt.getTime()).toBeLessThanOrEqual(oneHourFromNow + 1000);

    expect(mocks.sendResetEmail).toHaveBeenCalledWith(
      "user@alquileresanita.com.ar",
      createdToken,
      "https://alquileresanita.com.ar",
    );
  });

  it("still returns success when the reset email fails to send", async () => {
    mocks.sendResetEmail.mockRejectedValue(new Error("SMTP unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await requestPasswordReset(initialState, buildFormData());

    expect(result.ok).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      "[requestPasswordReset] Failed to send reset email:",
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });
});
