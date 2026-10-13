"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-auth";
import {
  ACTION_SUCCESS_MESSAGE,
  type ActionState,
} from "@/lib/admin-action-types";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es obligatoria."),
  newPassword: z
    .string()
    .min(6, "La nueva contraseña debe tener al menos 6 caracteres."),
  confirmPassword: z
    .string()
    .min(1, "La confirmación de la contraseña es obligatoria."),
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

function buildChangePasswordInput(formData: FormData): Record<string, unknown> {
  const text = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  return {
    currentPassword: text("currentPassword"),
    newPassword: text("newPassword"),
    confirmPassword: text("confirmPassword"),
  };
}

export async function changePassword(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requirePermission();

  const parsed = changePasswordSchema.safeParse(
    buildChangePasswordInput(formData),
  );
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      fieldErrors: {
        confirmPassword: "Las contraseñas nuevas no coinciden.",
      },
    };
  }

  if (newPassword === currentPassword) {
    return {
      ok: false,
      fieldErrors: {
        newPassword: "La nueva contraseña debe ser distinta a la actual.",
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    return {
      ok: false,
      message: "No se pudo verificar tu cuenta. Volvé a iniciar sesión.",
    };
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return {
      ok: false,
      fieldErrors: { currentPassword: "La contraseña actual es incorrecta." },
    };
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    },
  });

  revalidatePath("/admin");
  redirect("/admin?message=contrasena-actualizada");
}
