import { z } from "zod";
import { imageEntrySchema } from "@/lib/validations/property";

const requiredText = (message: string) =>
  z
    .string({
      required_error: message,
      invalid_type_error: message,
    })
    .trim()
    .min(1, { message });

export const aboutSchema = z.object({
  intro: z.string().trim(),
  body: z.string().trim(),
  images: z.array(imageEntrySchema).max(6).default([]),
});

export const whatToDoSchema = z.object({
  intro: z.string().trim(),
  cards: z
    .array(
      z.object({
        title: requiredText("El título del cuadro es obligatorio."),
        description: requiredText(
          "La descripción del cuadro es obligatoria.",
        ),
        image: imageEntrySchema,
      }),
    )
    .default([]),
});

/**
 * Aggregates zod issues into a per-field error map. Nested card issues
 * (paths like ["cards", 0, "title"] or ["cards", 0, "image", "url"]) all
 * aggregate under the single "cards" key as one readable message, mirroring
 * how property image issues aggregate under "images".
 */
export function collectSiteContentFieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const cardMessages: string[] = [];
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!key) continue;
    if (key === "cards") {
      cardMessages.push(issue.message);
    } else if (!(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  if (cardMessages.length > 0) {
    fieldErrors.cards = cardMessages.join("; ");
  }
  return fieldErrors;
}
