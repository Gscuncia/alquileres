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

export const expenseSchema = z
  .object({
    type: z.enum(["MANTENIMIENTO", "CONSORCIO"], {
      errorMap: () => ({ message: "El tipo de gasto es obligatorio." }),
    }),
    propertyId: z.string().trim().optional(),
    // Free text: the admin types categories like "Plomería" freely.
    category: requiredText("La categoría es obligatoria."),
    description: z.string().trim().optional(),
    amount: z
      .number({
        required_error: "El importe es obligatorio.",
        invalid_type_error: "El importe debe ser un número mayor que 0.",
      })
      .positive({ message: "El importe debe ser mayor que 0." }),
    date: requiredText("La fecha es obligatoria.").regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "La fecha no es válida.",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.type === "MANTENIMIENTO" && !data.propertyId) {
      ctx.addIssue({
        code: "custom",
        path: ["propertyId"],
        message:
          "El gasto de mantenimiento requiere seleccionar una propiedad.",
      });
    }
  })
  .transform((data) => ({
    ...data,
    // CONSORCIO is general: a property is never persisted with it.
    propertyId:
      data.type === "MANTENIMIENTO" ? data.propertyId || undefined : undefined,
    description: data.description || undefined,
    date: toUtc(data.date, "00:00"),
  }));

export type ExpenseInput = z.output<typeof expenseSchema>;
