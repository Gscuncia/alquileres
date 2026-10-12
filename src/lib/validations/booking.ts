import { z } from "zod";
import { toUtc } from "@/lib/datetime";

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
    firstName: requiredText("El nombre es obligatorio."),
    lastName: requiredText("El apellido es obligatorio."),
    dni: requiredText("El DNI es obligatorio.").regex(/^\d{7,8}$/, {
      message: "El DNI debe tener entre 7 y 8 dígitos.",
    }),
    phone: requiredText("El teléfono es obligatorio."),
    email: z
      .string()
      .trim()
      .email({ message: "El email no tiene un formato válido." })
      .or(z.literal(""))
      .optional(),
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
    paymentType: z.enum(["EFECTIVO", "TRANSFERENCIA"], {
      errorMap: () => ({ message: "El tipo de pago es obligatorio." }),
    }),
    paymentMethod: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    recipientId: z.string().trim().optional(),
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
      data.paymentType === "TRANSFERENCIA" &&
      !data.recipientId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["recipientId"],
        message: "El destinatario es obligatorio para pagos por transferencia.",
      });
    }
  })
  .transform((data) => ({
    ...data,
    // EFECTIVO never persists a recipient; TRANSFERENCIA keeps the chosen one.
    recipientId:
      data.paymentType === "TRANSFERENCIA" ? data.recipientId || undefined : undefined,
    email: data.email || undefined,
  }));

export type BookingInput = z.output<typeof bookingSchema>;
