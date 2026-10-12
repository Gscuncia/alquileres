"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-admin";
import { guestSchema } from "@/lib/validations/guest";
import {
  ACTION_SUCCESS_MESSAGE,
  type ActionState,
} from "@/lib/admin-action-types";

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

function isDniConflict(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

function readId(formData: FormData): string {
  const value = formData.get("id");
  return typeof value === "string" ? value.trim() : "";
}

function buildGuestInput(formData: FormData): Record<string, unknown> {
  const text = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  return {
    firstName: text("firstName"),
    lastName: text("lastName"),
    dni: text("dni"),
    phone: text("phone"),
    email: text("email"),
    notes: text("notes"),
  };
}

function revalidateGuestPaths(): void {
  revalidatePath("/admin/huespedes");
  revalidatePath("/admin");
}

export async function createGuest(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const parsed = guestSchema.safeParse(buildGuestInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  try {
    await prisma.guest.create({ data: parsed.data });
  } catch (error) {
    if (isDniConflict(error)) {
      return { ok: false, fieldErrors: { dni: "El DNI ya existe." } };
    }
    throw error;
  }

  revalidateGuestPaths();
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

export async function updateGuest(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const id = readId(formData);
  if (!id) {
    return { ok: false, message: "Huésped no encontrado." };
  }

  const existing = await prisma.guest.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, message: "Huésped no encontrado." };
  }

  const parsed = guestSchema.safeParse(buildGuestInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  try {
    // Keeping `id` out of the payload is fine: Prisma still enforces the
    // unique DNI on update, so a duplicate surfaces as P2002 here too.
    await prisma.guest.update({ where: { id }, data: parsed.data });
  } catch (error) {
    if (isDniConflict(error)) {
      return { ok: false, fieldErrors: { dni: "El DNI ya existe." } };
    }
    throw error;
  }

  revalidateGuestPaths();
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

/**
 * Delete is a plain form action (no ActionState flow): a guest with at
 * least one booking is blocked at action level (the Restrict FK on
 * Booking→Guest backs it up at DB level) and surfaces as an error banner
 * on the list page.
 */
export async function deleteGuest(formData: FormData): Promise<void> {
  await requireAdminForAction();

  const id = readId(formData);

  if (id) {
    const bookingsCount = await prisma.booking.count({
      where: { guestId: id },
    });

    if (bookingsCount > 0) {
      redirect("/admin/huespedes?error=reservas");
      // Unreachable in Next (redirect throws); keeps mock-based tests honest.
      return;
    }

    await prisma.guest.delete({ where: { id } });
    revalidateGuestPaths();
  }

  redirect("/admin/huespedes");
}
