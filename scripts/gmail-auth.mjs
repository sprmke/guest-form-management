#!/usr/bin/env node
/**
 * scripts/gmail-auth.mjs
 *
 * One-time OAuth setup for the `gmail-listener` edge function.
 *
 * What it does:
 *   1. Reads your OAuth 2.0 Desktop client from scripts/gmail-credentials.json
 *      (download from Google Cloud Console — see instructions below).
 *   2. Opens a browser so you can sign in as kamehome.azurenorth@gmail.com
 *      and grant Gmail read-only access.
 *   3. Exchanges the auth code for tokens (access + refresh).
 *   4. Writes / updates GMAIL_OAUTH_CLIENT_JSON and GMAIL_OAUTH_TOKEN_JSON
 *      in supabase/.env.local — the edge function reads them at runtime.
 *
 * Prerequisites (one-time setup):
 *   1. Google Cloud Console → guest-form-management project
 *      → APIs & Services → Enable "Gmail API"
 *   2. APIs & Services → Credentials → + Create Credentials
 *      → OAuth 2.0 Client ID → Application type: Desktop app
 *      → Name: "gmail-listener-local" → Create → Download JSON
 *   3. Save the downloaded file as: scripts/gmail-credentials.json
 *   4. Run: npm run gmail-auth
 *      Sign in as kamehome.azurenorth@gmail.com in the browser that opens.
 *
 * Re-running: safe to re-run if the refresh token expires. The .env.local
 * values are updated in-place (existing other vars are untouched).
 *
 * Reference: automated-tasks/pay-credit-cards/src/gmail-auth.ts
 *            (same OAuth flow, ported to pure Node.js — no extra npm packages)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CREDS_PATH = path.join(__dirname, 'gmail-credentials.json');
const ENV_PATH = path.join(ROOT, 'supabase', '.env.local');

const REDIRECT_URI = 'http://127.0.0.1:8765/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(msg);
}
function ok(msg) {
  console.log(`  ✅ ${msg}`);
}
function err(msg) {
  console.error(`  ❌ ${msg}`);
}
function info(msg) {
  console.log(`  ℹ  ${msg}`);
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (e) => {
    if (e)
      info(
        `Could not open browser automatically.\n     Open this URL manually:\n     ${url}`,
      );
  });
}

/**
 * Update (or insert) a KEY=VALUE line in supabase/.env.local.
 * The value is single-quoted so embedded JSON is safe.
 * Existing KEY lines are replaced in-place; all other lines stay untouched.
 */
function upsertEnvVar(content, key, value) {
  // Single-quote the value; escape any single-quotes inside the value
  const safeValue = value.replace(/'/g, `'\\''`);
  const line = `${key}='${safeValue}'`;
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  // Append with a blank separator line if needed
  const trimmed = content.trimEnd();
  return trimmed + (trimmed ? '\n' : '') + line + '\n';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('\n╔══════════════════════════════════════════════════╗');
  log('║  Gmail OAuth Setup — guest-form-management       ║');
  log('║  Target inbox: kamehome.azurenorth@gmail.com     ║');
  log('╚══════════════════════════════════════════════════╝\n');

  // ── 1. Load credentials ───────────────────────────────────────────────────

  if (!fs.existsSync(CREDS_PATH)) {
    err('scripts/gmail-credentials.json not found.\n');
    info('Steps to create it:');
    info(
      '  a. Go to https://console.cloud.google.com → guest-form-management project',
    );
    info('  b. APIs & Services → Enable "Gmail API"');
    info('  c. Credentials → + Create Credentials → OAuth 2.0 Client ID');
    info('     Application type: Desktop app  |  Name: gmail-listener-local');
    info('  d. Download the JSON → save as scripts/gmail-credentials.json\n');
    process.exit(1);
  }

  let raw, clientConfig;
  try {
    raw = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
    clientConfig = raw.installed ?? raw.web;
    if (!clientConfig)
      throw new Error('Neither "installed" nor "web" key found in JSON');
  } catch (e) {
    err(`Failed to parse scripts/gmail-credentials.json: ${e.message}`);
    process.exit(1);
  }

  const { client_id, client_secret } = clientConfig;
  if (!client_id || !client_secret) {
    err('credentials.json is missing client_id or client_secret.');
    process.exit(1);
  }
  ok(`Credentials loaded  (${client_id.slice(0, 24)}…)`);

  // ── 2. Build auth URL ──────────────────────────────────────────────────────

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', client_id);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  // prompt=consent forces Google to return a refresh_token every time
  authUrl.searchParams.set('prompt', 'consent');

  // ── 3. Open browser + wait for callback ───────────────────────────────────

  log('\n📂 Opening browser…');
  info('Sign in as: kamehome.azurenorth@gmail.com');
  info(
    'Grant: "Read all resources and their metadata — no write operations"\n',
  );
  openBrowser(authUrl.toString());

  const authCode = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith('/oauth2callback')) return;

      const callbackUrl = new URL(req.url, 'http://127.0.0.1:8765');
      const code = callbackUrl.searchParams.get('code');
      const error = callbackUrl.searchParams.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        error
          ? `<html><body><h2>❌ Authorization failed: ${error}</h2><p>Return to the terminal.</p></body></html>`
          : '<html><body><h2>✅ Authorization complete — you can close this tab.</h2><p>Return to the terminal.</p></body></html>',
      );
      server.close();

      if (error) reject(new Error(`OAuth error: ${error}`));
      else if (code) resolve(code);
      else reject(new Error('No code or error in OAuth callback'));
    });

    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Port 8765 is already in use. Stop whatever is running on it and try again.`,
          ),
        );
      } else {
        reject(e);
      }
    });

    server.listen(8765, '127.0.0.1', () => {
      info(
        'Listening on http://127.0.0.1:8765/oauth2callback — waiting for browser…',
      );
    });
  });

  ok('Authorization code received');

  // ── 4. Exchange code → tokens ──────────────────────────────────────────────

  log('\n🔄 Exchanging code for tokens…');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: authCode,
      client_id,
      client_secret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString(),
  });

  const tokenBody = await tokenRes.json();
  if (!tokenRes.ok) {
    err(
      `Token exchange failed (HTTP ${tokenRes.status}): ${JSON.stringify(tokenBody)}`,
    );
    process.exit(1);
  }
  if (!tokenBody.refresh_token) {
    err('Google did not return a refresh_token.\n');
    info(
      'This usually means the app was already authorized without prompt=consent.',
    );
    info(
      'Fix: go to https://myaccount.google.com/permissions → revoke this app → re-run.',
    );
    process.exit(1);
  }
  ok('Tokens received (access_token + refresh_token)');

  // ── 5. Write to supabase/.env.local ───────────────────────────────────────

  log('\n💾 Writing to supabase/.env.local…');

  // Individual fields — read directly by the gmail-listener edge function
  const refreshToken = tokenBody.refresh_token;

  let envContent = fs.existsSync(ENV_PATH)
    ? fs.readFileSync(ENV_PATH, 'utf8')
    : '';

  envContent = upsertEnvVar(envContent, 'GMAIL_OAUTH_CLIENT_ID',     client_id);
  envContent = upsertEnvVar(envContent, 'GMAIL_OAUTH_CLIENT_SECRET', client_secret);
  envContent = upsertEnvVar(envContent, 'GMAIL_OAUTH_REFRESH_TOKEN', refreshToken);
  // Full JSON blobs kept for auditability / re-extraction
  envContent = upsertEnvVar(envContent, 'GMAIL_OAUTH_CLIENT_JSON', JSON.stringify(raw));
  envContent = upsertEnvVar(envContent, 'GMAIL_OAUTH_TOKEN_JSON',  JSON.stringify(tokenBody));

  fs.writeFileSync(ENV_PATH, envContent, 'utf8');

  ok('GMAIL_OAUTH_CLIENT_ID      → supabase/.env.local');
  ok('GMAIL_OAUTH_CLIENT_SECRET  → supabase/.env.local');
  ok('GMAIL_OAUTH_REFRESH_TOKEN  → supabase/.env.local');
  ok('GMAIL_OAUTH_CLIENT_JSON    → supabase/.env.local (full blob for reference)');
  ok('GMAIL_OAUTH_TOKEN_JSON     → supabase/.env.local (full blob for reference)');

  log('\n╔══════════════════════════════════════════════════╗');
  log('║  ✅ Setup complete!                               ║');
  log('╠══════════════════════════════════════════════════╣');
  log('║  Next steps:                                     ║');
  log('║  1. Restart dev.sh to load the new secrets.      ║');
  log('║  2. For production: add these 3 vars to Supabase ║');
  log('║     dashboard → Settings → Edge Functions →      ║');
  log('║     Secrets:                                     ║');
  log('║     • GMAIL_OAUTH_CLIENT_ID                      ║');
  log('║     • GMAIL_OAUTH_CLIENT_SECRET                  ║');
  log('║     • GMAIL_OAUTH_REFRESH_TOKEN                  ║');
  log('╚══════════════════════════════════════════════════╝\n');
}

main().catch((e) => {
  err(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
