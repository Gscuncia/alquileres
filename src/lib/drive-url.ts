/** Requested width for the canonical Drive thumbnail URL. */
export const DRIVE_THUMBNAIL_SIZE = "w1200";

/** Drive file ids are 10+ chars of letters, digits, underscore or dash. */
const DRIVE_ID_PATTERN = "[A-Za-z0-9_-]{10,}";

// https://drive.google.com/file/d/ID[/view|/preview|...]
const FILE_PATH_RE = new RegExp(
  `drive\\.google\\.com/file/d/(${DRIVE_ID_PATTERN})`,
  "i",
);

// https://drive.google.com/{open,uc,thumbnail}?...id=ID...
const QUERY_ID_RE = new RegExp(
  `drive\\.google\\.com/\\S*[?&]id=(${DRIVE_ID_PATTERN})`,
  "i",
);

/**
 * Extracts the Drive file id from any common Drive URL format, or null.
 * Recognized shapes: /file/d/ID (with any trailing path), open?id=ID,
 * uc?id=ID (plus extra params) and thumbnail?id=ID (with or without sz).
 */
export function extractDriveFileId(url: string): string | null {
  const match =
    FILE_PATH_RE.exec(url) ?? QUERY_ID_RE.exec(url);
  return match ? match[1] : null;
}

/**
 * Normalizes a Google Drive link to the direct image URL
 * `https://drive.google.com/thumbnail?id=ID&sz=w1200`.
 * Non-Drive URLs and invalid input are returned unchanged (trimmed).
 * Idempotent: applying it to its own output yields the same result.
 */
export function toDirectDriveUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  const id = extractDriveFileId(trimmed);
  if (!id) return trimmed;
  return `https://drive.google.com/thumbnail?id=${id}&sz=${DRIVE_THUMBNAIL_SIZE}`;
}
