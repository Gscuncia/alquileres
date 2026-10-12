import { z } from "zod";

const requiredText = (message: string) =>
  z
    .string({
      required_error: message,
      invalid_type_error: message,
    })
    .trim()
    .min(1, { message });

export const recipientSchema = z.object({
  name: requiredText("El nombre del destinatario es obligatorio."),
});

export type RecipientInput = z.infer<typeof recipientSchema>;
