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

export const expenseSchema = z.object({
  typeId: requiredText("El tipo de gasto es obligatorio."),
  // The requiresProperty cross-field rule lives in the action (it needs the
  // DB type row); the schema keeps propertyId optional and untouched.
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
}).transform((data) => ({
  ...data,
  propertyId: data.propertyId || undefined,
  description: data.description || undefined,
  date: toUtc(data.date, "00:00"),
}));

export type ExpenseInput = z.output<typeof expenseSchema>;

export const expenseTypeSchema = z.object({
  name: requiredText("El nombre del tipo es obligatorio."),
  // Checkbox arrives as part of the form; the action normalizes it ("on" →
  // true, otherwise false) before calling the schema.
  requiresProperty: z.boolean({
    required_error: "El campo requiere propiedad no es válido.",
    invalid_type_error: "El campo requiere propiedad no es válido.",
  }),
});

export type ExpenseTypeInput = z.output<typeof expenseTypeSchema>;
