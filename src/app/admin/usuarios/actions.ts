"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-auth";
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

  revalidatePath("/admin/usuarios");
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}
