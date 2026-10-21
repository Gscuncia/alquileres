"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-auth";
import { sendWelcomeEmail } from "@/lib/mail";
import {
  ACTION_SUCCESS_MESSAGE,
  type ActionState,
} from "@/lib/admin-action-types";

const DEFAULT_WELCOME_PASSWORD = "anita1234";

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("El email no es válido."),
  firstName: z.string().trim().min(1, "El nombre es obligatorio."),
  lastName: z.string().trim().min(1, "El apellido es obligatorio."),
  roleId: z.string().trim().min(1, "El rol es obligatorio."),
});

const updateContactSettingsSchema = z.object({
  inquiryEmail: z.string().trim().email("Ingresá un email válido."),
  whatsappPhone: z
    .string()
    .regex(/^\d{8,15}$/, "El WhatsApp debe tener entre 8 y 15 dígitos."),
  backupEmail: z
    .string()
    .trim()
    .email("Ingresá un email válido.")
    .optional()
    .or(z.literal("")),
  backupHour: z.coerce
    .number()
    .int("La hora del backup debe estar entre 0 y 23.")
    .min(0, "La hora del backup debe estar entre 0 y 23.")
    .max(23, "La hora del backup debe estar entre 0 y 23.")
    .default(8),
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

function isEmailConflict(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

function buildCreateUserInput(formData: FormData): Record<string, unknown> {
  const text = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  return {
    email: text("email"),
    firstName: text("firstName"),
    lastName: text("lastName"),
    roleId: text("roleId"),
  };
}

export async function deleteUser(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdminForAction();

  const userId =
    typeof formData.get("userId") === "string"
      ? (formData.get("userId") as string).trim()
      : "";

  if (!userId) {
    return { ok: false, message: "Usuario no encontrado." };
  }

  if (session!.user.id === userId) {
    return { ok: false, message: "No podés eliminar tu propio usuario." };
  }

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/usuarios");
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

export async function createUser(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const parsed = createUserSchema.safeParse(buildCreateUserInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  const role = await prisma.role.findUnique({
    where: { id: parsed.data.roleId },
    select: { id: true },
  });
  if (!role) {
    return {
      ok: false,
      fieldErrors: { roleId: "El rol seleccionado no existe." },
    };
  }

  const passwordHash = await bcrypt.hash(DEFAULT_WELCOME_PASSWORD, 10);

  try {
    await prisma.user.create({
      data: {
        email: parsed.data.email,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        roleId: parsed.data.roleId,
        passwordHash,
        mustChangePassword: true,
      },
    });
  } catch (error) {
    if (isEmailConflict(error)) {
      return {
        ok: false,
        fieldErrors: { email: "Ya existe un usuario con ese email." },
      };
    }
    throw error;
  }

  try {
    await sendWelcomeEmail(parsed.data.email, DEFAULT_WELCOME_PASSWORD);
  } catch (emailError) {
    // Do not fail user creation if the email cannot be delivered; the admin
    // already knows the default password and can share it manually.
    // eslint-disable-next-line no-console
    console.error("[createUser] Failed to send welcome email:", emailError);
  }

  revalidatePath("/admin/usuarios");
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

export async function updateContactSettings(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const inquiryEmail =
    typeof formData.get("inquiryEmail") === "string"
      ? (formData.get("inquiryEmail") as string).trim()
      : "";

  // Strip spaces, dashes, and plus signs before validating digits only.
  const whatsappPhone = (
    typeof formData.get("whatsappPhone") === "string"
      ? (formData.get("whatsappPhone") as string)
      : ""
  )
    .replace(/[\s\-+]/g, "")
    .trim();

  const backupEmail =
    typeof formData.get("backupEmail") === "string"
      ? (formData.get("backupEmail") as string).trim()
      : "";

  // An empty select value coerces to 0 via z.coerce, so normalize it to
  // undefined here to let the schema default kick in (8).
  const rawBackupHour = formData.get("backupHour");
  const backupHourInput =
    typeof rawBackupHour === "string" && rawBackupHour.trim() !== ""
      ? rawBackupHour.trim()
      : undefined;

  const parsed = updateContactSettingsSchema.safeParse({
    inquiryEmail,
    whatsappPhone,
    backupEmail,
    backupHour: backupHourInput,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      inquiryEmail: parsed.data.inquiryEmail,
      whatsappPhone: parsed.data.whatsappPhone,
      backupEmail: parsed.data.backupEmail ?? "",
      backupHour: parsed.data.backupHour,
    },
    update: {
      inquiryEmail: parsed.data.inquiryEmail,
      whatsappPhone: parsed.data.whatsappPhone,
      backupEmail: parsed.data.backupEmail ?? "",
      backupHour: parsed.data.backupHour,
    },
  });

  revalidatePath("/contacto");
  revalidatePath("/propiedades/[slug]", "page");
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}
