"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { type ActionState } from "@/lib/admin-action-types";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "El enlace de recuperación no es válido."),
  newPassword: z
    .string()
    .min(6, "La nueva contraseña debe tener al menos 6 caracteres."),
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

function buildResetPasswordInput(formData: FormData): Record<string, unknown> {
  const text = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  return {
    token: text("token"),
    newPassword: text("newPassword"),
  };
}

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(buildResetPasswordInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  const { token, newPassword } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return {
      ok: false,
      message: "El enlace de recuperación es inválido o expiró.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: resetToken.email },
    select: { id: true },
  });

  if (!user) {
    return {
      ok: false,
      message: "El enlace de recuperación es inválido o expiró.",
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    }),
    prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    }),
  ]);

  redirect("/auth/signin");
}
