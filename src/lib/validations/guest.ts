import { z } from "zod";

const requiredText = (message: string) =>
  z
    .string({
      required_error: message,
      invalid_type_error: message,
    })
    .trim()
    .min(1, { message });

export const guestSchema = z.object({
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
    .optional()
    .transform((value) => value || undefined),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
});

export type GuestInput = z.output<typeof guestSchema>;
