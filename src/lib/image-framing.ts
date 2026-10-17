import type { CSSProperties } from "react";

export type ImageFit = "cover" | "contain";

export type ImagePosition =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export interface PropertyImage {
  url: string;
  fit: ImageFit;
  position: ImagePosition;
}

/** Runtime lists mirroring the enums, shared by the form and the action. */
export const IMAGE_FITS: readonly ImageFit[] = ["cover", "contain"];

export const IMAGE_POSITIONS: readonly ImagePosition[] = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

function isImageFit(value: unknown): value is ImageFit {
  return value === "cover" || value === "contain";
}

function isImagePosition(value: unknown): value is ImagePosition {
  return (IMAGE_POSITIONS as readonly unknown[]).includes(value);
}

/**
 * Tolerant parser: accepts {url,fit,position} objects (invalid values fall
 * back to defaults) AND legacy plain-string URLs (-> cover/center). Returns
 * null for unusable entries.
 */
export function normalizeImage(value: unknown): PropertyImage | null {
  if (typeof value === "string") {
    const url = value.trim();
    return url === ""
      ? null
      : { url, fit: "cover", position: "center" };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const candidate = value as { url?: unknown; fit?: unknown; position?: unknown };
  if (typeof candidate.url !== "string") {
    return null;
  }
  const url = candidate.url.trim();
  if (url === "") {
    return null;
  }

  return {
    url,
    fit: isImageFit(candidate.fit) ? candidate.fit : "cover",
    position: isImagePosition(candidate.position) ? candidate.position : "center",
  };
}

/** Normalizes a raw list, dropping unusable entries and keeping order. */
export function normalizeImages(raw: unknown): PropertyImage[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(normalizeImage)
    .filter((image): image is PropertyImage => image !== null);
}

/** Crop-anchor presets mapped to `objectPosition` percentages. */
const POSITION_STYLE: Record<ImagePosition, CSSProperties> = {
  "top-left": { objectPosition: "0% 0%" },
  top: { objectPosition: "50% 0%" },
  "top-right": { objectPosition: "100% 0%" },
  left: { objectPosition: "0% 50%" },
  center: { objectPosition: "50% 50%" },
  right: { objectPosition: "100% 50%" },
  "bottom-left": { objectPosition: "0% 100%" },
  bottom: { objectPosition: "50% 100%" },
  "bottom-right": { objectPosition: "100% 100%" },
};

/** React style for an <img>: { objectFit, objectPosition }. */
export function imageStyle(image: PropertyImage): CSSProperties {
  return {
    objectFit: image.fit,
    ...POSITION_STYLE[image.position],
  };
}
