#!/usr/bin/env bun
/**
 * Push UI hosted-dev env vars to Vercel project `kame-homes` (Preview + Development).
 *
 * Requires a valid Vercel CLI session: `npx vercel login --github --oob`
 *
 * Usage:
 *   bun scripts/dev/sync-vercel-dev-env.mjs [--dry-run] [--production-too]
 *
 * Default scopes: preview + development (multi-tenant DEV / dev.kamehomes.space).
 * Pass --production-too only when intentionally mirroring the same values to Production
 * (not recommended until mt-prod cutover).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '../..');
const DRY_RUN = process.argv.includes('--dry-run');
const INCLUDE_PRODUCTION = process.argv.includes('--production-too');

const PROJECT = 'kame-homes';
const SCOPE = 'kame-works';

const UI_KEYS = [
  'VITE_NODE_ENV',
  'VITE_SUPABASE_URL',
  'VITE_API_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPER_ADMIN_EMAILS',
  'VITE_PLATFORM_APP_NAME',
  'VITE_PLATFORM_CONTACT_EMAIL',
  'VITE_GOOGLE_MAPS_API_KEY',
  'VITE_TURNSTILE_SITE_KEY',
  'VITE_POSTHOG_KEY',
  'VITE_POSTHOG_HOST',
  'VITE_VAPID_PUBLIC_KEY',
  'POSTHOG_PERSONAL_API_KEY',
  'POSTHOG_PROJECT_ID',
];

/** @param {string} raw */
function parseEnvFile(raw) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (key) map.set(key, value);
  }
  return map;
}

function vercel(args) {
  return spawnSync('npx', ['--yes', 'vercel@41.7.8', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

const who = vercel(['whoami']);
if (who.status !== 0) {
  console.error('Vercel CLI not authenticated.');
  console.error('Run: npx vercel@41.7.8 login --github --oob');
  console.error(who.stderr || who.stdout);
  process.exit(1);
}
console.log(`Vercel user: ${(who.stdout || '').trim()}`);

const hostedPath = join(ROOT, 'ui/.env.development.dev');
const rootPath = join(ROOT, 'ui/.env');
if (!existsSync(hostedPath)) {
  console.error(`Missing ${hostedPath}`);
  process.exit(1);
}

const hosted = parseEnvFile(readFileSync(hostedPath, 'utf8'));
const shared = existsSync(rootPath) ? parseEnvFile(readFileSync(rootPath, 'utf8')) : new Map();

const values = new Map();
for (const key of UI_KEYS) {
  const v = hosted.get(key)?.trim() || shared.get(key)?.trim();
  if (v) values.set(key, v);
}

const targets = ['preview', 'development'];
if (INCLUDE_PRODUCTION) targets.push('production');

console.log(`Setting ${values.size} vars on ${PROJECT} (${targets.join(', ')})`);

for (const [key, value] of values) {
  for (const env of targets) {
    const args = [
      'env',
      'add',
      key,
      env,
      '--force',
      '--scope',
      SCOPE,
      '--yes',
    ];
    // vercel env add reads value from stdin when not interactive
    if (DRY_RUN) {
      console.log(`dry-run: vercel env add ${key} ${env}`);
      continue;
    }
    const res = spawnSync('npx', ['--yes', 'vercel@41.7.8', ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      input: `${value}\n`,
      env: { ...process.env, VERCEL_ORG_ID: undefined },
    });
    if (res.status !== 0) {
      // Fallback: some CLI versions want `vercel env add NAME` then environment prompt
      console.warn(`warn ${key}@${env}: ${(res.stderr || res.stdout || '').trim().slice(0, 200)}`);
    } else {
      console.log(`set ${key} → ${env}`);
    }
  }
}

console.log(DRY_RUN ? 'dry-run complete' : 'Vercel env sync attempted. Verify in Dashboard → kame-homes → Settings → Environment Variables.');
