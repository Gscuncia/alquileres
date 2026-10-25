"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-auth";
import { ADMIN_TABS, GRANTABLE_ADMIN_TABS } from "@/lib/admin-tabs";
import {
  ACTION_SUCCESS_MESSAGE,
  type ActionState,
} from "@/lib/admin-action-types";

const createRoleSchema = z.object({
  name: z.string().trim().min(1, "El nombre del rol es obligatorio."),
  allowedTabs: z.array(z.string()).default([]),
  // Empty string = role default (no explicit landing tab selected).
  landingTab: z.string().default(""),
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
  for (const tab of ADMIN_TABS) {
    if (formData.get(`tab-${tab.id}`) === "on") {
      allowedTabs.push(tab.id);
    }
  }

  return {
    name: text("name"),
    allowedTabs,
    landingTab: text("landingTab"),
  };
}

const GRANTABLE_TAB_IDS = new Set(GRANTABLE_ADMIN_TABS.map((tab) => tab.id));
const LANDING_TAB_ERROR = "La pestaña inicial debe estar entre las pestañas permitidas.";

/**
 * Normalizes the landing tab: empty → null (default landing). A landing tab
 * that is not among the role's allowed tabs is rejected so a role can never
 * land on a page it cannot access. A role with no allowed tabs has no landing.
 */
function normalizeLandingTab(
  allowedTabs: string[],
  landingTab: string,
): { value: string | null } | { error: string } {
  if (!landingTab) {
    return { value: null };
  }
  if (!GRANTABLE_TAB_IDS.has(landingTab)) {
    return { value: null };
  }
  if (!allowedTabs.includes(landingTab)) {
    return { error: LANDING_TAB_ERROR };
  }
  return { value: landingTab };
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

  const landing = normalizeLandingTab(
    parsed.data.allowedTabs,
    parsed.data.landingTab,
  );
  if ("error" in landing) {
    return { ok: false, fieldErrors: { landingTab: landing.error } };
  }

  try {
    await prisma.role.create({
      data: { ...parsed.data, landingTab: landing.value },
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

  const landing = normalizeLandingTab(
    parsed.data.allowedTabs,
    parsed.data.landingTab,
  );
  if ("error" in landing) {
    return { ok: false, fieldErrors: { landingTab: landing.error } };
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
        landingTab: landing.value,
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
