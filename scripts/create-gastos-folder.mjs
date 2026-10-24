// Creates the "Gastos" receipts folder in the user's Drive via OAuth
// (drive.file scope only sees app-created files, so the app must own the
// folder it uploads into) and upserts its ID into .env.local.
//
// Usage: node scripts/create-gastos-folder.mjs [folderName]

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ENV_PATH = path.resolve(".env.local");
const FOLDER_NAME = process.argv[2] ?? "Gastos";

function readEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=(.*)\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

function upsertEnvLine(text, key, value) {
  const lines = text.split(/\r?\n/);
  const index = lines.findIndex((line) => line.startsWith(`${key}=`));
  if (index >= 0) lines[index] = `${key}=${value}`;
  else lines.push("", `${key}=${value}`);
  return lines.join("\n");
}

const envText = await readFile(ENV_PATH, "utf8");
const env = readEnv(envText);

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    grant_type: "refresh_token",
  }),
});
const tokenJson = await tokenRes.json();
if (!tokenJson.access_token) {
  console.error("Failed to get access token:", JSON.stringify(tokenJson));
  process.exit(1);
}

const createRes = await fetch(
  "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  },
);
const created = await createRes.json();
if (!createRes.ok) {
  console.error("Folder creation failed:", JSON.stringify(created));
  process.exit(1);
}

await writeFile(
  ENV_PATH,
  upsertEnvLine(envText, "GOOGLE_DRIVE_GASTOS_FOLDER_ID", created.id),
  "utf8",
);
console.log(`Folder "${created.name}" created. id=${created.id}`);
console.log(`Link: ${created.webViewLink}`);
console.log("GOOGLE_DRIVE_GASTOS_FOLDER_ID updated in .env.local");
