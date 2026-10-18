"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-admin";
import { bookingSchema, type BookingInput } from "@/lib/validations/booking";
import { formatInTz, toUtc } from "@/lib/datetime";
import {
  ACTION_SUCCESS_MESSAGE,
  type ActionState,
} from "@/lib/admin-action-types";

/**
 * Form normalizer: HTML date/time inputs and money fields arrive as strings;
 * they are trimmed/coerced here so the zod schema can validate them as the
 * typed shape declared in `bookingSchema`.
 */
function buildBookingInput(formData: FormData): Record<string, unknown> {
  const text = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  const number = (key: string): number | undefined => {
    const raw = text(key);
    if (raw === "") return undefined;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  return {
    propertyId: text("propertyId"),
    guestId: text("guestId"),
    checkInDate: text("checkInDate"),
    checkInTime: text("checkInTime"),
    checkOutDate: text("checkOutDate"),
    checkOutTime: text("checkOutTime"),
    pricePerNight: number("pricePerNight"),
    depositAmount: number("depositAmount"),
    depositPaymentType: text("depositPaymentType") as "EFECTIVO" | "TRANSFERENCIA",
    depositPaymentMethod: text("depositPaymentMethod"),
    depositRecipientId: text("depositRecipientId"),
    restPaymentType: text("restPaymentType") as "EFECTIVO" | "TRANSFERENCIA",
    restRecipientId: text("restRecipientId"),
    notes: text("notes"),
  };
}

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

function readId(formData: FormData): string {
  const value = formData.get("id");
  return typeof value === "string" ? value.trim() : "";
}

/** Only relative admin paths are accepted as post-delete targets. */
function sanitizeRedirect(raw: FormData): string {
  const value = raw.get("redirectTo");
  return typeof value === "string" && value.startsWith("/admin/")
    ? value
    : "/admin/reservas";
}

function revalidateBookingPaths(propertyId: string): void {
  revalidatePath(`/admin/propiedades/${propertyId}/agenda`);
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/calendario");
  revalidatePath("/admin");
  revalidatePath("/admin/destinatarios");
}

function toPrismaData(data: BookingInput) {
  return {
    propertyId: data.propertyId,
    guestId: data.guestId,
    checkIn: toUtc(data.checkInDate, data.checkInTime),
    checkOut: toUtc(data.checkOutDate, data.checkOutTime),
    pricePerNight: data.pricePerNight,
    depositAmount: data.depositAmount,
    depositPaymentType: data.depositPaymentType,
    depositPaymentMethod: data.depositPaymentMethod || null,
    depositTransferRecipientId: data.depositRecipientId ?? null,
    restPaymentType: data.restPaymentType,
    restTransferRecipientId: data.restRecipientId ?? null,
    notes: data.notes || null,
  };
}

/**
 * Overlap check happens INSIDE the transaction after acquiring a
 * per-property advisory lock: a concurrent save on the same property waits
 * for the lock, then re-runs the conflict query against the committed
 * winner — exactly one of two parallel saves can succeed.
 */
async function withOverlapCheck(
  tx: Prisma.TransactionClient,
  propertyId: string,
  checkIn: Date,
  checkOut: Date,
  excludeId: string | undefined,
): Promise<ActionState | null> {
  // The lock function returns `void`, which Prisma cannot deserialize
  // ("Failed to deserialize column of type 'void'"); cast to text.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${propertyId}))::text AS locked`;

  const conflict = await tx.booking.findFirst({
    where: {
      propertyId,
      // Edit excludes itself: a booking never conflicts with its own stay.
      ...(excludeId ? { id: { not: excludeId } } : {}),
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: {
      guest: { select: { firstName: true, lastName: true } },
      checkIn: true,
      checkOut: true,
    },
  });

  if (conflict) {
    return {
      ok: false,
      message: `Conflicto con la reserva de ${conflict.guest.firstName} ${conflict.guest.lastName} (${formatInTz(
        conflict.checkIn,
      )} → ${formatInTz(conflict.checkOut)})`,
    };
  }

  return null;
}

export async function createBooking(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const parsed = bookingSchema.safeParse(buildBookingInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  const data = toPrismaData(parsed.data);
  const { propertyId, checkIn, checkOut } = data;

  return prisma.$transaction(async (tx) => {
    const conflict = await withOverlapCheck(
      tx,
      propertyId,
      checkIn,
      checkOut,
      undefined,
    );
    if (conflict) return conflict;

    await tx.booking.create({ data });
    revalidateBookingPaths(propertyId);
    return { ok: true, message: ACTION_SUCCESS_MESSAGE };
  });
}

export async function updateBooking(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const id = readId(formData);
  if (!id) {
    return { ok: false, message: "Reserva no encontrada." };
  }

  const existing = await prisma.booking.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, message: "Reserva no encontrada." };
  }

  const parsed = bookingSchema.safeParse(buildBookingInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  const data = toPrismaData(parsed.data);
  const { propertyId, checkIn, checkOut } = data;

  return prisma.$transaction(async (tx) => {
    const conflict = await withOverlapCheck(
      tx,
      propertyId,
      checkIn,
      checkOut,
      // Self-exclusion: the booking being edited never conflicts with itself.
      id,
    );
    if (conflict) return conflict;

    await tx.booking.update({ where: { id }, data });
    revalidateBookingPaths(propertyId);
    return { ok: true, message: ACTION_SUCCESS_MESSAGE };
  });
}

/**
 * Delete is a plain form action (no ActionState flow): ConfirmButton submits
 * it; on success the caller is redirected to `redirectTo` (the agenda or the
 * global reservations list).
 */
export async function deleteBooking(formData: FormData): Promise<void> {
  await requireAdminForAction();

  const id = readId(formData);
  const redirectTo = sanitizeRedirect(formData);

  if (id) {
    const existing = await prisma.booking.findUnique({
      where: { id },
      select: { propertyId: true },
    });

    if (existing) {
      await prisma.booking.delete({ where: { id } });
      revalidateBookingPaths(existing.propertyId);
    }
  }

  redirect(redirectTo);
}
