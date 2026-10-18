"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-auth";
import { toDirectDriveUrl } from "@/lib/drive-url";
import { IMAGE_FITS, type ImageFit } from "@/lib/image-framing";
import { ABOUT_PAGE, WHAT_TO_DO_PAGE } from "@/lib/site-content";
import {
  aboutSchema,
  whatToDoSchema,
  collectSiteContentFieldErrors,
} from "@/lib/validations/site-content";
import {
  ACTION_SUCCESS_MESSAGE,
  type ActionState,
} from "@/lib/admin-action-types";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function strings(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""));
}

/**
 * Zips the five parallel image lists (url/fit/x/y/zoom) submitted by the
 * ImageRow editor. Invalid values become `undefined` so the zod defaults
 * apply; the caller decides whether empty-url rows are dropped or validated.
 */
function readImageRows(formData: FormData) {
  const parseFit = (value: string | undefined): ImageFit | undefined =>
    (IMAGE_FITS as readonly string[]).includes(value ?? "")
      ? (value as ImageFit)
      : undefined;

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

  const urls = strings(formData, "images").map(toDirectDriveUrl);
  const fits = strings(formData, "imageFit");
  const xs = strings(formData, "imageX");
  const ys = strings(formData, "imageY");
  const zooms = strings(formData, "imageZoom");

  return urls.map((url, index) => ({
    url,
    fit: parseFit(fits[index]),
    x: parseNumber(xs[index], 0, 100),
    y: parseNumber(ys[index], 0, 100),
    zoom: parseNumber(zooms[index], 0.5, 3),
  }));
}

function buildAboutInput(formData: FormData) {
  return {
    intro: text(formData, "intro"),
    body: text(formData, "body"),
    images: readImageRows(formData).filter((row) => row.url.length > 0),
  };
}

function buildWhatToDoInput(formData: FormData) {
  const titles = strings(formData, "cardTitle");
  const descriptions = strings(formData, "cardDescription");
  const imageRows = readImageRows(formData);

  // Cards count is driven by the titles list; a card with no title AND no
  // image URL is an empty row the editor still submits, so it is dropped.
  // Keeping empty-url cards lets the schema flag them as a validation error.
  const cards = titles
    .map((title, index) => ({
      title,
      description: descriptions[index] ?? "",
      image: imageRows[index] ?? { url: "" },
    }))
    .filter((card) => !(card.title === "" && card.image.url === ""));

  return { intro: text(formData, "intro"), cards };
}

function revalidatePublicPages(): void {
  revalidatePath("/quienes-somos");
  revalidatePath("/que-hacer-en-san-clemente");
}

export async function updateAboutContent(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const parsed = aboutSchema.safeParse(buildAboutInput(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: collectSiteContentFieldErrors(parsed.error),
    };
  }

  const data = {
    intro: parsed.data.intro,
    body: parsed.data.body,
    images: parsed.data.images,
  };
  await prisma.siteContent.upsert({
    where: { page: ABOUT_PAGE },
    create: { page: ABOUT_PAGE, ...data },
    update: data,
  });

  revalidatePublicPages();
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

export async function updateWhatToDoContent(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const parsed = whatToDoSchema.safeParse(buildWhatToDoInput(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: collectSiteContentFieldErrors(parsed.error),
    };
  }

  const data = {
    intro: parsed.data.intro,
    cards: parsed.data.cards,
  };
  await prisma.siteContent.upsert({
    where: { page: WHAT_TO_DO_PAGE },
    create: { page: WHAT_TO_DO_PAGE, ...data },
    update: data,
  });

  revalidatePublicPages();
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}
