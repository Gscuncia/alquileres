import { toDateStr, toTimeStr } from "@/lib/datetime";
import type { BookingFormValues } from "@/components/admin/BookingForm";

/**
 * Shared booking → form-values mapper for every booking edit surface
 * (reservas/nueva, agenda, calendario). Prisma Decimals arrive as unknown
 * numeric-likes and are converted once at the boundary.
 */
export function bookingToFormValues(
  booking: {
    id: string;
    guest: { id: string };
    checkIn: Date;
    checkOut: Date;
    pricePerNight: unknown;
    depositAmount: unknown;
    depositPaymentType: "EFECTIVO" | "TRANSFERENCIA";
    depositPaymentMethod: string | null;
    depositTransferRecipientId: string | null;
    restPaymentType: "EFECTIVO" | "TRANSFERENCIA";
    restTransferRecipientId: string | null;
    notes: string | null;
  },
  propertyId: string,
): BookingFormValues {
  return {
    id: booking.id,
    propertyId,
    guestId: booking.guest.id,
    checkInDate: toDateStr(booking.checkIn),
    checkInTime: toTimeStr(booking.checkIn),
    checkOutDate: toDateStr(booking.checkOut),
    checkOutTime: toTimeStr(booking.checkOut),
    pricePerNight: String(Number(booking.pricePerNight)),
    depositAmount: String(Number(booking.depositAmount)),
    depositPaymentType: booking.depositPaymentType,
    depositPaymentMethod: booking.depositPaymentMethod ?? "",
    depositRecipientId: booking.depositTransferRecipientId ?? "",
    restPaymentType: booking.restPaymentType,
    restRecipientId: booking.restTransferRecipientId ?? "",
    notes: booking.notes ?? "",
  };
}
