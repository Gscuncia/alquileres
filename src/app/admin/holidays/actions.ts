"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-admin";
import { holidaySchema } from "@/lib/validations/holiday";
import {
  ACTION_SUCCESS_MESSAGE,
  type ActionState,
} from "@/lib/admin-action-types";

const DUPLICATE_DATE_ERROR = "Ya existe un feriado en esa fecha.";

/**
 * Form normalizer: HTML inputs arrive as strings; they are trimmed here so
 * the zod schema can validate them as the typed shape declared in
 * `holidaySchema`.
 */
function buildHolidayInput(formData: FormData): Record<string, unknown> {
  const text = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  return {
    date: text("date"),
    notes: text("notes"),
  };
}

function collectFieldErrors(error: import("zod").ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function isDateConflict(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

function readId(formData: FormData): string {
  const value = formData.get("id");
  return typeof value === "string" ? value.trim() : "";
}

function revalidateHolidayPaths(): void {
  revalidatePath("/admin/feriados");
  revalidatePath("/admin/calendario");
}

/**
 * Create-or-update for the Feriados tab: an absent/empty `id` creates, a
 * present `id` updates. The `date` uniqueness (one holiday per day) surfaces
 * as a Spanish field error both on create (P2002) and on update (P2002 never
 * fires for a row keeping its own date, so re-submitting unchanged is fine).
 */
export async function upsertHoliday(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const parsed = holidaySchema.safeParse(buildHolidayInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  const id = readId(formData);
  const data = { date: parsed.data.date, notes: parsed.data.notes };

  if (id) {
    const existing = await prisma.holiday.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, message: "Feriado no encontrado." };
    }

    try {
      await prisma.holiday.update({ where: { id }, data });
    } catch (error) {
      if (isDateConflict(error)) {
        return {
          ok: false,
          fieldErrors: { date: DUPLICATE_DATE_ERROR },
        };
      }
      throw error;
    }
  } else {
    try {
      await prisma.holiday.create({ data });
    } catch (error) {
      if (isDateConflict(error)) {
        return {
          ok: false,
          fieldErrors: { date: DUPLICATE_DATE_ERROR },
        };
      }
      throw error;
    }
  }

  revalidateHolidayPaths();
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

/**
 * Delete is a plain form action (no ActionState flow): ConfirmButton
 * submits it and the caller is redirected back to the feriados list.
 */
export async function deleteHoliday(formData: FormData): Promise<void> {
  await requireAdminForAction();

  const id = readId(formData);

  if (id) {
    await prisma.holiday.delete({ where: { id } });
    revalidateHolidayPaths();
  }

  redirect("/admin/feriados");
}
