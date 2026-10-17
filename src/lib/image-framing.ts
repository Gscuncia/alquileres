import type { CSSProperties } from "react";

export type ImageFit = "cover" | "contain";

export interface PropertyImage {
  url: string;
  fit: ImageFit;
  /** Focus/pan point as percentages of the visible square: 0..100. */
  x: number;
  y: number;
  /** Scale multiplier on top of the fit baseline: 0.5..3. 1 = untouched. */
  zoom: number;
}

/** Runtime lists mirroring the enums, shared by the form and the action. */
export const IMAGE_FITS: readonly ImageFit[] = ["cover", "contain"];

/** The nine legacy crop presets, mapped to focus percentages. */
const LEGACY_POSITION_XY: Record<string, { x: number; y: number }> = {
  "top-left": { x: 0, y: 0 },
  top: { x: 50, y: 0 },
  "top-right": { x: 100, y: 0 },
  left: { x: 0, y: 50 },
  center: { x: 50, y: 50 },
  right: { x: 100, y: 50 },
  "bottom-left": { x: 0, y: 100 },
  bottom: { x: 50, y: 100 },
  "bottom-right": { x: 100, y: 100 },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function isImageFit(value: unknown): value is ImageFit {
  return value === "cover" || value === "contain";
}

/** Accepts a finite number inside range, clamped; anything else is undefined. */
function readPercentage(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, 0, 100)
    : undefined;
}

function readZoom(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, 0.5, 3)
    : undefined;
}

/**
 * Tolerant parser: accepts {url,fit,x,y,zoom} objects, legacy
 * {url,fit,position-preset} objects and plain-string URLs. Invalid or
 * missing values fall back to the defaults (cover/50/50/1). Returns null
 * for unusable entries.
 */
export function normalizeImage(value: unknown): PropertyImage | null {
  const legacyFocus = (position: unknown): { x: number; y: number } =>
    LEGACY_POSITION_XY[position as string] ?? { x: 50, y: 50 };

  if (typeof value === "string") {
    const url = value.trim();
    return url === "" ? null : { url, fit: "cover", x: 50, y: 50, zoom: 1 };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const candidate = value as {
    url?: unknown;
    fit?: unknown;
    x?: unknown;
    y?: unknown;
    zoom?: unknown;
    position?: unknown;
  };
  if (typeof candidate.url !== "string") {
    return null;
  }
  const url = candidate.url.trim();
  if (url === "") {
    return null;
  }

  // Explicit x/y win; otherwise the legacy position preset maps to a
  // focus point; otherwise center.
  const legacy = legacyFocus(candidate.position);
  return {
    url,
    fit: isImageFit(candidate.fit) ? candidate.fit : "cover",
    x: readPercentage(candidate.x) ?? legacy.x,
    y: readPercentage(candidate.y) ?? legacy.y,
    zoom: readZoom(candidate.zoom) ?? 1,
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

/**
 * React style for an <img> that must sit inside a positioned (`relative`)
 * overflow-hidden box. The image element is oversized by the zoom factor and
 * anchored so the stored focal point (x%, y%) sits at the same point of the
 * visible box. Rendering through element geometry (left/top plus a
 * translate(-x, -y)) pans at ANY zoom and for ANY image aspect; plain
 * object-position only pans along the axes where the fixed cover layout has
 * slack, which is why pans appeared frozen after zooming. With zoom >= 1 the
 * element always fully covers the box.
 */
export function imageStyle(image: PropertyImage): CSSProperties {
  const zoomScale = Math.max(image.zoom, 1);
  const anchor = {
    position: "absolute" as const,
    left: `${image.x}%`,
    top: `${image.y}%`,
    transform: `translate(-${image.x}%, -${image.y}%)`,
    objectPosition: "50% 50%",
  };

  if (image.fit === "contain") {
    return {
      ...anchor,
      width: "100%",
      height: "100%",
      objectFit: "contain",
    };
  }

  return {
    ...anchor,
    width: `${zoomScale * 100}%`,
    height: `${zoomScale * 100}%`,
    objectFit: "cover",
  };
}
