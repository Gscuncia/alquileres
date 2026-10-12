import { z } from "zod";

const httpUrl = z
  .string()
  .url({ message: "Cada imagen debe ser una URL válida (http o https)." })
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "Cada imagen debe ser una URL válida (http o https).",
  });

const requiredText = (message: string) =>
  z
    .string({
      required_error: message,
      invalid_type_error: message,
    })
    .trim()
    .min(1, { message });

export const propertySchema = z.object({
  title: requiredText("El título es obligatorio."),
  slug: requiredText("El slug es obligatorio.").regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    {
      message:
        "El slug solo admite letras minúsculas, números y guiones (URL amigable).",
    },
  ),
  location: requiredText("La ubicación es obligatoria."),
  shortDescription: requiredText("La descripción corta es obligatoria."),
  description: requiredText("La descripción es obligatoria."),
  capacity: z
    .number({
      required_error: "La capacidad es obligatoria.",
      invalid_type_error: "La capacidad debe ser un número entero mayor o igual a 1.",
    })
    .int({ message: "La capacidad debe ser un número entero mayor o igual a 1." })
    .min(1, { message: "La capacidad debe ser un número entero mayor o igual a 1." }),
  bedrooms: z
    .number({
      required_error: "Los dormitorios son obligatorios.",
      invalid_type_error:
        "Los dormitorios deben ser un número entero mayor o igual a 0.",
    })
    .int({
      message: "Los dormitorios deben ser un número entero mayor o igual a 0.",
    })
    .min(0, {
      message: "Los dormitorios deben ser un número entero mayor o igual a 0.",
    }),
  bathrooms: z
    .number({
      required_error: "Los baños son obligatorios.",
      invalid_type_error: "Los baños deben ser un número entero mayor o igual a 0.",
    })
    .int({ message: "Los baños deben ser un número entero mayor o igual a 0." })
    .min(0, { message: "Los baños deben ser un número entero mayor o igual a 0." }),
  amenities: z.array(z.string().trim().min(1)).optional(),
  images: z.array(httpUrl).optional(),
  published: z.boolean().default(true),
  sortOrder: z
    .number({
      invalid_type_error: "El orden debe ser un número entero mayor o igual a 0.",
    })
    .int({ message: "El orden debe ser un número entero mayor o igual a 0." })
    .min(0, { message: "El orden debe ser un número entero mayor o igual a 0." })
    .default(0),
});

export type PropertyInput = z.infer<typeof propertySchema>;
