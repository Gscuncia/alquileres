import { z } from "zod";
import { toUtc, stayNights } from "@/lib/datetime";

const requiredText = (message: string) =>
  z
    .string({
      required_error: message,
      invalid_type_error: message,
    })
    .trim()
    .min(1, { message });

const date = (label: string) => {
  const required = `La fecha de ${label} es obligatoria.`;
  const invalid = `La fecha de ${label} no es válida.`;
  return requiredText(required).regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: invalid,
  });
};

/** Time selectable at 30-minute granularity: `10:00`, `14:30`, `23:30`… */
const timeSlot = (label: string) =>
  requiredText(`La hora de ${label} es obligatoria.`).regex(
    /^([01]\d|2[0-3]):(00|30)$/,
    {
      message: `La hora de ${label} debe ser un horario válido: intervalos de 30 minutos (por ejemplo 10:00 o 14:30).`,
    },
  );

export const bookingSchema = z
  .object({
    propertyId: requiredText("La propiedad es obligatoria."),
    guestId: requiredText("El huésped es obligatorio."),
    checkInDate: date("ingreso"),
    checkInTime: timeSlot("ingreso"),
    checkOutDate: date("egreso"),
    checkOutTime: timeSlot("egreso"),
    pricePerNight: z
      .number({
        required_error: "El precio por noche es obligatorio.",
        invalid_type_error:
          "El precio por noche debe ser un número mayor que 0.",
      })
      .positive({ message: "El precio por noche debe ser mayor que 0." }),
    depositAmount: z
      .number({
        required_error: "El importe de la seña debe ser un número.",
        invalid_type_error:
          "El importe de la seña debe ser un número mayor o igual a 0.",
      })
      .min(0, { message: "El importe de la seña debe ser mayor o igual a 0." })
      .default(0),
    depositPaymentType: z.enum(["EFECTIVO", "TRANSFERENCIA"], {
      errorMap: () => ({
        message: "El tipo de pago de la seña es obligatorio.",
      }),
    }),
    depositPaymentMethod: z.string().trim().optional(),
    depositRecipientId: z.string().trim().optional(),
    restPaymentType: z.enum(["EFECTIVO", "TRANSFERENCIA"], {
      errorMap: () => ({
        message: "El tipo de pago del monto a pagar es obligatorio.",
      }),
    }),
    restRecipientId: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const checkIn = toUtc(data.checkInDate, data.checkInTime);
    const checkOut = toUtc(data.checkOutDate, data.checkOutTime);

    if (checkIn.getTime() >= checkOut.getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["checkOut"],
        message: "La fecha y hora de egreso deben ser posteriores al ingreso.",
      });
    }

    if (
      data.depositPaymentType === "TRANSFERENCIA" &&
      !data.depositRecipientId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["depositRecipientId"],
        message:
          "El destinatario es obligatorio para la seña por transferencia.",
      });
    }

    if (data.restPaymentType === "TRANSFERENCIA" && !data.restRecipientId) {
      ctx.addIssue({
        code: "custom",
        path: ["restRecipientId"],
        message:
          "El destinatario es obligatorio para el monto a pagar por transferencia.",
      });
    }

    // The deposit can never exceed the stay total; the nights math is only
    // meaningful when the stay itself is valid.
    if (checkIn.getTime() < checkOut.getTime()) {
      const total = data.pricePerNight * stayNights(checkIn, checkOut);
      if (data.depositAmount > total) {
        ctx.addIssue({
          code: "custom",
          path: ["depositAmount"],
          message: "La seña no puede superar el monto total de la reserva.",
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    // EFECTIVO never persists a recipient; TRANSFERENCIA keeps the chosen one.
    depositRecipientId:
      data.depositPaymentType === "TRANSFERENCIA"
        ? data.depositRecipientId || undefined
        : undefined,
    restRecipientId:
      data.restPaymentType === "TRANSFERENCIA"
        ? data.restRecipientId || undefined
        : undefined,
  }));

export type BookingInput = z.output<typeof bookingSchema>;
