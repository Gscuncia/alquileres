/**
 * Invoice/receipt uploads for expenses ("gastos") backed by the Google Drive
 * REST API over plain fetch (no googleapis dependency).
 *
 * Env contract (client id/secret/refresh token already provisioned in .env.local):
 *   GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
 *   GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_DRIVE_GASTOS_FOLDER_ID
 *
 * Every env read happens at call time so importing this module from a client
 * component (for the pure helpers) never touches server secrets or crashes.
 */

const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

/** Serverless request bodies cap around ~4.5MB on Vercel: receipts stay under 4MB. */
export const MAX_RECEIPT_SIZE_BYTES = 4 * 1024 * 1024;

export interface ReceiptUpload {
  bytes: Uint8Array;
  mimeType: string;
}

export interface UploadedReceipt {
  fileId: string;
  fileName: string;
  webViewLink: string;
}

/** Thrown when Drive API calls fail for non-auth reasons (upload/trash). */
export class DriveReceiptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveReceiptError";
  }
}

/** Thrown when the refresh-token exchange fails (401 / invalid_grant). */
export class DriveAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveAuthError";
  }
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
};

export function isAllowedReceiptMime(mimeType: string): boolean {
  return ALLOWED_RECEIPT_MIME_TYPES.has(mimeType);
}

export function buildReceiptFileName(
  expenseId: string,
  mimeType: string,
): string {
  const extension = EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    throw new DriveReceiptError(
      `Cannot build receipt file name for unsupported mime type: ${mimeType}`,
    );
  }
  return `${expenseId}${extension}`;
}

export function receiptViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/** Access tokens are cached until 60s before their documented expiry. */
let tokenCache: { token: string; expiresAt: number } | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new DriveReceiptError(
      `Missing environment variable ${name}; receipt upload to Drive is not configured.`,
    );
  }
  return value;
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt - Date.now() > 60_000) {
    return tokenCache.token;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: requireEnv("GOOGLE_OAUTH_REFRESH_TOKEN"),
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    }),
  });

  const data = (await response.json().catch(() => null)) as TokenResponse | null;

  if (!response.ok || !data?.access_token) {
    tokenCache = null;
    throw new DriveAuthError(
      `Failed to refresh the Drive access token (${data?.error ?? response.status}): ${
        data?.error_description ?? "unknown error"
      }`,
    );
  }

  // Keep a safety margin: treat the token as expiring 60s earlier than stated.
  const expiresInSeconds = data.expires_in ?? 3600;
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
  return tokenCache.token;
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function uploadReceipt(
  expenseId: string,
  file: ReceiptUpload,
): Promise<UploadedReceipt> {
  if (!isAllowedReceiptMime(file.mimeType)) {
    throw new DriveReceiptError(
      `Unsupported receipt mime type: ${file.mimeType || "unknown"}`,
    );
  }
  if (file.bytes.byteLength === 0) {
    throw new DriveReceiptError("Receipt file is empty.");
  }
  if (file.bytes.byteLength > MAX_RECEIPT_SIZE_BYTES) {
    throw new DriveReceiptError(
      `Receipt file exceeds the ${MAX_RECEIPT_SIZE_BYTES} byte limit.`,
    );
  }

  const folderId = requireEnv("GOOGLE_DRIVE_GASTOS_FOLDER_ID");
  const fileName = buildReceiptFileName(expenseId, file.mimeType);
  const accessToken = await getAccessToken();

  // Multipart upload: JSON metadata part + binary media part. Built by hand
  // with Uint8Array chunks so binary content survives without encoding loss.
  const boundary = `alquileres-receipt-${Math.random().toString(36).slice(2)}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const encoder = new TextEncoder();
  const head = encoder.encode(
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${file.mimeType}\r\n\r\n`,
  );
  const tail = encoder.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(head.byteLength + file.bytes.byteLength + tail.byteLength);
  body.set(head, 0);
  body.set(
    file.bytes,
    head.byteLength,
  );
  body.set(tail, head.byteLength + file.bytes.byteLength);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  const created = (await response.json().catch(() => null)) as {
    id?: string;
    name?: string;
    webViewLink?: string;
  } | null;

  if (!response.ok || !created?.id) {
    throw new DriveReceiptError(
      `Drive upload failed (${response.status}): ${await readErrorBody(response)}`,
    );
  }

  return {
    fileId: created.id,
    fileName: created.name ?? fileName,
    webViewLink: created.webViewLink ?? receiptViewUrl(created.id),
  };
}

/**
 * Moves a Drive file to the trash (never a hard delete). Missing files are
 * treated as already-gone so callers can retry safely.
 */
export async function trashReceipt(fileId: string): Promise<boolean> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trashed: true }),
    },
  );

  if (response.status === 404) return true;
  if (!response.ok) {
    throw new DriveReceiptError(
      `Drive trash failed (${response.status}): ${await readErrorBody(response)}`,
    );
  }
  return true;
}
