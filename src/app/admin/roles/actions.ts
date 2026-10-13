"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-auth";
import {
  ACTION_SUCCESS_MESSAGE,
  type ActionState,
} from "@/lib/admin-action-types";

const TAB_OPTIONS = [
  { id: "panel", label: "Panel" },
  { id: "calendario", label: "Calendario" },
  { id: "propiedades", label: "Propiedades" },
  { id: "reservas", label: "Reservas" },
  { id: "huespedes", label: "Huéspedes" },
  { id: "destinatarios", label: "Destinatarios" },
  { id: "gastos", label: "Gastos" },
] as const;

const createRoleSchema = z.object({
  name: z.string().trim().min(1, "El nombre del rol es obligatorio."),
  allowedTabs: z.array(z.string()).default([]),
});

const updateRoleSchema = createRoleSchema.extend({
  id: z.string().trim().min(1, "El rol es obligatorio."),
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

function isNameConflict(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

function buildRoleInput(formData: FormData): Record<string, unknown> {
  const text = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  const allowedTabs: string[] = [];
  for (const tab of TAB_OPTIONS) {
    if (formData.get(`tab-${tab.id}`) === "on") {
      allowedTabs.push(tab.id);
    }
  }

  return {
    name: text("name"),
    allowedTabs,
  };
}

export async function createRole(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const parsed = createRoleSchema.safeParse(buildRoleInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  try {
    await prisma.role.create({ data: parsed.data });
  } catch (error) {
    if (isNameConflict(error)) {
      return {
        ok: false,
        fieldErrors: { name: "Ya existe un rol con ese nombre." },
      };
    }
    throw error;
  }

  revalidatePath("/admin/roles");
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

export async function updateRole(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const input = {
    id: typeof formData.get("id") === "string" ? (formData.get("id") as string).trim() : "",
    ...buildRoleInput(formData),
  };

  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  const existing = await prisma.role.findUnique({
    where: { id: parsed.data.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, message: "Rol no encontrado." };
  }

  try {
    await prisma.role.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        allowedTabs: parsed.data.allowedTabs,
      },
    });
  } catch (error) {
    if (isNameConflict(error)) {
      return {
        ok: false,
        fieldErrors: { name: "Ya existe un rol con ese nombre." },
      };
    }
    throw error;
  }

  revalidatePath("/admin/roles");
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}
