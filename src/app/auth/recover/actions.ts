"use server";

import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendResetEmail } from "@/lib/mail";
import { type ActionState } from "@/lib/admin-action-types";

const requestResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("El email no es válido."),
});

function collectFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function buildRequestResetInput(formData: FormData): Record<string, unknown> {
  const value = formData.get("email");
  return {
    email: typeof value === "string" ? value : "",
  };
}

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function requestPasswordReset(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestResetSchema.safeParse(buildRequestResetInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { email: true },
  });

  if (user) {
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    const token = randomBytes(RESET_TOKEN_BYTES).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt,
      },
    });

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    try {
      await sendResetEmail(user.email, token, origin);
    } catch (emailError) {
      // Do not leak whether the email exists or whether delivery succeeded.
      // eslint-disable-next-line no-console
      console.error("[requestPasswordReset] Failed to send reset email:", emailError);
    }
  }

  return {
    ok: true,
    message:
      "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.",
  };
}
