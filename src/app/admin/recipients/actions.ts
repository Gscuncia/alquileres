"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-admin";
import { recipientSchema } from "@/lib/validations/recipient";
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

function isNameConflict(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

function readId(formData: FormData): string {
  const value = formData.get("id");
  return typeof value === "string" ? value.trim() : "";
}

function readName(formData: FormData): Record<string, string> {
  const value = formData.get("name");
  return { name: typeof value === "string" ? value.trim() : "" };
}

function revalidateRecipientPaths(): void {
  revalidatePath("/admin/destinatarios");
  revalidatePath("/admin");
}

export async function createRecipient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const parsed = recipientSchema.safeParse(readName(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  try {
    await prisma.transferRecipient.create({ data: parsed.data });
  } catch (error) {
    if (isNameConflict(error)) {
      return { ok: false, fieldErrors: { name: "El destinatario ya existe" } };
    }
    throw error;
  }

  revalidateRecipientPaths();
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

export async function updateRecipient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const id = readId(formData);
  if (!id) {
    return { ok: false, message: "Destinatario no encontrado." };
  }

  const existing = await prisma.transferRecipient.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, message: "Destinatario no encontrado." };
  }

  const parsed = recipientSchema.safeParse(readName(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  try {
    await prisma.transferRecipient.update({
      where: { id },
      data: parsed.data,
    });
  } catch (error) {
    if (isNameConflict(error)) {
      return { ok: false, fieldErrors: { name: "El destinatario ya existe" } };
    }
    throw error;
  }

  revalidateRecipientPaths();
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

/**
 * Delete is a plain form action: a recipient with at least one booking is
 * blocked at action level (the Restrict FK on Booking→Recipient backs it
 * up at DB level) and surfaces as an error banner on the list page.
 */
export async function deleteRecipient(formData: FormData): Promise<void> {
  await requireAdminForAction();

  const id = readId(formData);

  if (id) {
    const bookingsCount = await prisma.booking.count({
      where: {
        OR: [{ depositTransferRecipientId: id }, { restTransferRecipientId: id }],
      },
    });

    if (bookingsCount > 0) {
      redirect("/admin/destinatarios?error=reservas");
      // Unreachable in Next (redirect throws); keeps mock-based tests honest.
      return;
    }

    await prisma.transferRecipient.delete({ where: { id } });
    revalidateRecipientPaths();
  }

  redirect("/admin/destinatarios");
}
