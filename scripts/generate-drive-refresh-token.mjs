// One-time OAuth consent flow for the Google Drive upload feature.
//
// What it does:
//   1. Reads GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / (optional)
//      GOOGLE_DRIVE_GASTOS_FOLDER_ID from .env.local.
//   2. Opens the browser so the user can consent (scope: drive.file, offline).
//   3. Catches the redirect on http://localhost:53231, exchanges the code for
//      tokens, and upserts GOOGLE_OAUTH_REFRESH_TOKEN into .env.local.
//   4. Sanity-checks the refresh token and (if configured) the Drive folder
//      by calling the Drive API.
//
// Usage: node scripts/generate-drive-refresh-token.mjs

import { readFile } from "node:fs/promises";
import { exec } from "node:child_process";
import http from "node:http";
import path from "node:path";

const ENV_PATH = path.resolve(".env.local");
const PORT = 53231;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/drive.file";

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

async function main() {
  const envText = await readFile(ENV_PATH, "utf8");
  const env = readEnv(envText);
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
  const folderId = env.GOOGLE_DRIVE_GASTOS_FOLDER_ID ?? "";

  if (!clientId || !clientSecret) {
    console.error("Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env.local");
    process.exit(1);
  }

  // Manual mode: `node scripts/generate-drive-refresh-token.mjs --code <code-or-url>`
  // skips the local server entirely — the user pastes the redirect URL (even
  // though the browser shows a connection error) and we exchange the code.
  const codeArgIndex = process.argv.indexOf("--code");
  const manualCode = codeArgIndex >= 0 ? process.argv[codeArgIndex + 1] : null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  console.log("Opening browser for Google consent...");
  console.log("(If it does not open, paste this URL in the browser manually:)");
  console.log(authUrl);
  if (!manualCode) exec(`start "" "${authUrl}"`);

  let code = null;
  if (manualCode) {
    // Accept either the bare code or the full redirect URL from the address bar.
    const asUrl = manualCode.match(/[?&]code=([^&\s]+)/);
    code = asUrl ? decodeURIComponent(asUrl[1]) : manualCode.trim();
  } else {
    code = await listenForCode();
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.refresh_token) {
    console.error("No refresh_token in response:", JSON.stringify(tokenJson));
    process.exit(1);
  }

  const newText = upsertEnvLine(envText, "GOOGLE_OAUTH_REFRESH_TOKEN", tokenJson.refresh_token);
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(ENV_PATH, newText, "utf8"),
  );
  console.log("GOOGLE_OAUTH_REFRESH_TOKEN saved to .env.local (masked).");

  // Sanity check: exchange refresh token for an access token, then check
  // the configured folder is readable.
  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: tokenJson.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const refreshJson = await refreshRes.json();
  if (!refreshJson.access_token) {
    console.error("Refresh token check failed:", JSON.stringify(refreshJson));
    process.exit(1);
  }
  console.log("Refresh token works (access token obtained).");

  if (folderId) {
    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,webViewLink`,
      { headers: { Authorization: `Bearer ${refreshJson.access_token}` } },
    );
    const folderJson = await folderRes.json();
    if (folderRes.ok) {
      console.log(`Folder OK: name="${folderJson.name}" id="${folderJson.id}"`);
      console.log(`Link: ${folderJson.webViewLink}`);
    } else {
      console.error("Folder check failed:", JSON.stringify(folderJson));
      process.exit(1);
    }
  }
  console.log("All done.");
  process.exit(0);
}

function listenForCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      if (error) {
        res.end(`<h2>Consent failed: ${error}</h2>`);
        reject(new Error(`Google returned an error: ${error}`));
        return;
      }
      if (!code) {
        res.end("<h2>Waiting for code...</h2>");
        return;
      }
      res.end("<h2>Done! You can close this window.</h2>");
      server.close();
      resolve(code);
    });
    server.listen(PORT, () => {
      console.log(`Listening on ${REDIRECT_URI} ... waiting for Google redirect.`);
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
