"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-admin";
import { propertySchema } from "@/lib/validations/property";
import { toDirectDriveUrl } from "@/lib/drive-url";
import {
  ACTION_SUCCESS_MESSAGE,
  type ActionState,
} from "@/lib/admin-action-types";
import {
  IMAGE_FITS,
  type ImageFit,
} from "@/lib/image-framing";

/**
 * Form normalizers: repeated `amenities` entries and image rows arrive
 * ordered from the dynamic list editors; numeric fields arrive as strings
 * and are coerced so the zod schema can validate them as numbers.
 *
 * Images arrive as five parallel lists (`images`, `imageFit`, `imageX`,
 * `imageY`, `imageZoom`), one entry per row in DOM order, zipped by index
 * here. Rows with an empty URL (after trim + Drive conversion) are dropped
 * after the zip so list alignment never desyncs. Invalid/missing fit values
 * become `undefined` so the zod defaults apply; malformed x/y/zoom values
 * become `undefined` too (defaults 50/50/1) and valid ones are clamped to
 * their zod-accepted ranges before validation.
 */
function buildPropertyInput(formData: FormData) {
  const text = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  const list = (key: string): string[] =>
    formData
      .getAll(key)
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0);

  const strings = (key: string): string[] =>
    formData
      .getAll(key)
      .map((value) => (typeof value === "string" ? value.trim() : ""));

  const parseFit = (value: string | undefined): ImageFit | undefined =>
    (IMAGE_FITS as readonly string[]).includes(value ?? "")
      ? (value as ImageFit)
      : undefined;

  /** Number or undefined on empty/NaN; then clamped to [min, max]. */
  const parseNumber = (
    value: string | undefined,
    min: number,
    max: number,
  ): number | undefined => {
    if (value === undefined || value === "") return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed)
      ? undefined
      : Math.min(max, Math.max(min, parsed));
  };

  const number = (key: string): number | undefined => {
    const raw = text(key).trim();
    if (raw === "") return undefined;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  // The form always sends a hidden `published`="false" before the checkbox;
  // the last entry wins, so unchecked parses explicitly to false.
  const published =
    formData.getAll("published").map(String).pop() === "true";

  const urls = strings("images").map(toDirectDriveUrl);
  const fits = strings("imageFit");
  const xs = strings("imageX");
  const ys = strings("imageY");
  const zooms = strings("imageZoom");

  const images = urls
    .map((url, index) => ({
      url,
      fit: parseFit(fits[index]),
      x: parseNumber(xs[index], 0, 100),
      y: parseNumber(ys[index], 0, 100),
      zoom: parseNumber(zooms[index], 0.5, 3),
    }))
    .filter((row) => row.url.length > 0);

  return {
    title: text("title"),
    slug: text("slug"),
    location: text("location"),
    shortDescription: text("shortDescription"),
    description: text("description"),
    capacity: number("capacity"),
    bedrooms: number("bedrooms"),
    bathrooms: number("bathrooms"),
    amenities: list("amenities"),
    images,
    color: text("color"),
    published,
    sortOrder: number("sortOrder"),
  };
}

function collectFieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const imageMessages: string[] = [];
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!key) continue;
    // Image issues carry nested paths like ["images", 0, "url"]; they all
    // aggregate under the single "images" key as one readable message.
    if (key === "images") {
      imageMessages.push(issue.message);
    } else if (!(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  if (imageMessages.length > 0) {
    fieldErrors.images = imageMessages.join("; ");
  }
  return fieldErrors;
}

function isSlugConflict(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

function isForeignKeyViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2003";
}

function readId(formData: FormData): string {
  const value = formData.get("id");
  return typeof value === "string" ? value : "";
}

function revalidatePropertyPaths(slug: string): void {
  revalidatePath("/");
  revalidatePath(`/propiedades/${slug}`);
  revalidatePath("/admin/propiedades");
}

export async function createProperty(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const parsed = propertySchema.safeParse(buildPropertyInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  try {
    await prisma.property.create({ data: parsed.data });
  } catch (error) {
    if (isSlugConflict(error)) {
      return { ok: false, fieldErrors: { slug: "El slug ya existe" } };
    }
    throw error;
  }

  revalidatePropertyPaths(parsed.data.slug);
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

export async function updateProperty(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const id = readId(formData);
  if (!id) {
    return { ok: false, message: "Propiedad no encontrada." };
  }

  const existing = await prisma.property.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!existing) {
    return { ok: false, message: "Propiedad no encontrada." };
  }

  const parsed = propertySchema.safeParse(buildPropertyInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  try {
    await prisma.property.update({ where: { id }, data: parsed.data });
  } catch (error) {
    if (isSlugConflict(error)) {
      return { ok: false, fieldErrors: { slug: "El slug ya existe" } };
    }
    throw error;
  }

  revalidatePropertyPaths(parsed.data.slug);
  revalidatePath(`/admin/propiedades/${id}`);

  // Renaming the slug (or unpublishing) leaves a stale static page behind;
  // revalidating the old slug lets the public 404 show up without a redeploy.
  if (existing.slug !== parsed.data.slug) {
    revalidatePath(`/propiedades/${existing.slug}`);
  }

  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

/**
 * Delete is a plain form action (no ActionState flow): on success it redirects
 * back to the list. A property with bookings is protected by the DB foreign
 * key (Restrict); P2003 surfaces as a Spanish error banner on the list page.
 */
export async function deleteProperty(formData: FormData): Promise<void> {
  await requireAdminForAction();

  const id = readId(formData);
  if (!id) {
    redirect("/admin/propiedades");
  }

  try {
    const existing = await prisma.property.findUnique({
      where: { id },
      select: { slug: true, published: true },
    });

    // A published property is live on the public site: the owner must
    // unpublish it first so the deletion is never an accidental takedown.
    if (existing?.published) {
      redirect("/admin/propiedades?error=publicada");
      // Unreachable in Next (redirect throws); keeps mock-based tests honest.
      return;
    }

    if (existing) {
      await prisma.property.delete({ where: { id } });
      revalidatePath("/");
      revalidatePath(`/propiedades/${existing.slug}`);
      revalidatePath("/admin/propiedades");
    }
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      redirect("/admin/propiedades?error=eliminar");
      // Unreachable in Next (redirect throws); keeps mock-based tests honest.
      return;
    }
    throw error;
  }

  redirect("/admin/propiedades");
}
