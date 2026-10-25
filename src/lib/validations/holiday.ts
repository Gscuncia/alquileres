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

export const holidaySchema = z.object({
  notes: requiredText("Las observaciones son obligatorias."),
  date: requiredText("La fecha es obligatoria.").regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La fecha no es válida.",
  }),
}).transform((data) => ({
  ...data,
  // Holidays are calendar dates; they are stored/compared in UTC-safe form
  // like expenses (BA midnight via the explicit offset).
  date: toUtc(data.date, "00:00"),
}));

export type HolidayInput = z.output<typeof holidaySchema>;
