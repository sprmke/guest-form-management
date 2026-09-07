#!/usr/bin/env bun
/**
 * Sync local secrets → hosted multi-tenant DEV (linked Supabase project fwor…).
 *
 * 1. Merge shared edge secrets from supabase/.env.local into supabase/.env.dev.local
 * 2. Align ui/.env.development.dev with hosted-dev branding / observability / PWA keys
 * 3. Push edge secrets to linked Supabase (DEV)
 * 4. Unset legacy Google/Gmail secrets migrated to DB
 *
 * Usage:
 *   bun scripts/dev/sync-dev-env.mjs [--dry-run] [--skip-remote] [--skip-local]
 *
 * Does NOT touch Vercel (requires a valid `vercel login`) or LEGACY/prod Supabase.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '../..');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_REMOTE = process.argv.includes('--skip-remote');
const SKIP_LOCAL = process.argv.includes('--skip-local');

const DEV_REF = 'fworvijbrwpyngycotbz';
const DEV_ORIGIN = 'https://dev.kamehomes.space';
const DEV_SUPABASE_URL = `https://${DEV_REF}.supabase.co`;

/** Keys that belong on hosted DEV edge secrets (copied from .env.local when missing). */
const DEV_EDGE_FROM_LOCAL = [
  'ENVIRONMENT',
  'ADMIN_ALLOWED_EMAILS',
  'SUPER_ADMIN_EMAILS',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'RESEND_INBOUND_WEBHOOK_SECRET',
  'RESEND_APPROVAL_INBOUND_DOMAIN',
  'SUPPORT_TEAM_EMAIL',
  'GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY',
  'SETTINGS_VERIFICATION_SECRET',
  'SUPER_ADMIN_VERIFICATION_SECRET',
  'TURNSTILE_SECRET_KEY',
  'CAPTCHA_MODE',
  'FACEBOOK_REVIEWS_URL',
  'AIRBNB_URL',
  'INSTAGRAM_URL',
  'TIKTOK_URL',
  'GEMINI_API_KEYS',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'META_APP_ID',
  'META_APP_SECRET',
  'META_INBOX_TOKEN_ENCRYPTION_KEY',
  'META_WEBHOOK_VERIFY_TOKEN',
  'META_OAUTH_EXCLUDE_PUBLISHING_SCOPES',
  'META_OAUTH_EXTRA_SCOPES',
  'PAYMONGO_SECRET_KEY',
  'PAYMONGO_WEBHOOK_SECRET',
  'JAMENDO_CLIENT_ID',
  'POSTHOG_API_KEY',
  'POSTHOG_HOST',
  'VAPID_KEYS',
  'VAPID_SUBJECT',
  'PUSH_FANOUT_SECRET',
  'PLATFORM_APP_NAME',
  'SD_REFUND_CRON_SECRET',
  'TELEGRAM_CRON_SECRET',
  'TELEGRAM_STAFF_CRON_SECRET',
  'TELEGRAM_ADMIN_CRON_SECRET',
  'TELEGRAM_FINANCE_CRON_SECRET',
  'TELEGRAM_MAINTENANCE_CRON_SECRET',
  'PARKING_BROADCAST_EXPIRE_CRON_SECRET',
  'PARKING_REMINDER_CRON_SECRET',
  'CONTRACT_EXPIRY_CRON_SECRET',
  'DASHBOARD_ASSISTANT_EXPIRE_CRON_SECRET',
  'META_INBOX_WEBHOOK_HEALTHCHECK_CRON_SECRET',
  'PLATFORM_BILLING_CRON_SECRET',
  'CALENDAR_SYNC_CRON_SECRET',
  'SMART_PRICING_CRON_SECRET',
  'SUPERHOST_ASSESSMENT_CRON_SECRET',
];

/** Never push to hosted DEV from local-only ngrok / override paths. */
const NEVER_PUSH_TO_REMOTE = new Set([
  'PROD_DB_URL',
  'DEV_DB_URL',
  'DEV_PROJECT_REF',
  'DEV_SUPABASE_URL',
  'DEV_SERVICE_ROLE_KEY',
  'PROD_PROJECT_REF',
  'GEMINI_MODEL_OVERRIDE',
  'GEMINI_MODEL_OVERRIDE_DASHBOARD_ASSISTANT',
  'PLATFORM_CONTACT_EMAIL',
  // Local ngrok aliases — hosted uses PUBLIC_API_URL = DEV_SUPABASE_URL
  'SUPABASE_PUBLIC_URL',
]);

const LEGACY_REMOTE_UNSET = [
  'GMAIL_API_WEB_CLIENT_JSON',
  'GMAIL_OAUTH_ALLOWED_RETURN_ORIGINS',
  'GOOGLE_CALENDAR_ID',
  'GOOGLE_SERVICE_ACCOUNT',
  'GOOGLE_SPREADSHEET_ID',
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

/** @param {string} path */
function readEnv(path) {
  if (!existsSync(path)) return new Map();
  return parseEnvFile(readFileSync(path, 'utf8'));
}

/** @param {Map<string, string>} map @param {string} key @param {string} value */
function setIfMissing(map, key, value) {
  const cur = map.get(key)?.trim();
  if (!cur && value) {
    map.set(key, value);
    return 'added';
  }
  return null;
}

/** @param {Map<string, string>} map @param {string} key @param {string} value */
function setAlways(map, key, value) {
  if (!value) return null;
  const prev = map.get(key);
  if (prev === value) return null;
  map.set(key, value);
  return prev === undefined ? 'added' : 'updated';
}

/**
 * @param {string} path
 * @param {{ title: string; keys: string[] }[]} sections
 * @param {Map<string, string>} values
 */
function writeSectionedEnv(path, sections, values) {
  const used = new Set();
  const lines = [];
  for (const section of sections) {
    const entries = section.keys
      .map((key) => ({ key, value: values.get(key) }))
      .filter((e) => e.value !== undefined && e.value !== '');
    if (entries.length === 0) continue;
    lines.push('', `# ${section.title}`);
    for (const { key, value } of entries) {
      used.add(key);
      const needsQuotes = /[\s#"'\\]/.test(value) || value.includes(',');
      lines.push(needsQuotes ? `${key}='${value.replace(/'/g, "'\\''")}'` : `${key}=${value}`);
    }
  }
  const extras = [...values.keys()].filter((k) => !used.has(k)).sort();
  if (extras.length > 0) {
    lines.push('', '# Other');
    for (const key of extras) {
      const value = values.get(key) ?? '';
      const needsQuotes = /[\s#"'\\]/.test(value) || value.includes(',');
      lines.push(needsQuotes ? `${key}='${value.replace(/'/g, "'\\''")}'` : `${key}=${value}`);
    }
  }
  const body = `${lines.join('\n').replace(/^\n+/, '')}\n`;
  if (!DRY_RUN) writeFileSync(path, body, 'utf8');
  return body;
}

function mergeDevLocal() {
  const localPath = join(ROOT, 'supabase/.env.local');
  const devPath = join(ROOT, 'supabase/.env.dev.local');
  const local = readEnv(localPath);
  const dev = readEnv(devPath);

  const changes = [];

  // Force hosted-dev URL / origin shape
  for (const [key, value, label] of [
    ['DEV_PROJECT_REF', DEV_REF, 'dev ref'],
    ['DEV_SUPABASE_URL', DEV_SUPABASE_URL, 'dev url'],
    ['PUBLIC_API_URL', DEV_SUPABASE_URL, 'public api'],
    ['PUBLIC_GUEST_APP_ORIGIN', DEV_ORIGIN, 'guest origin'],
    ['ENVIRONMENT', 'development', 'environment'],
  ]) {
    const r = setAlways(dev, key, value);
    if (r) changes.push(`${r} ${key} (${label})`);
  }

  // Meta OAuth return origins must include hosted-dev SPA
  const metaOrigins =
    'http://127.0.0.1:5173,http://localhost:5173,https://dev.kamehomes.space';
  const rMeta = setAlways(dev, 'META_OAUTH_ALLOWED_RETURN_ORIGINS', metaOrigins);
  if (rMeta) changes.push(`${rMeta} META_OAUTH_ALLOWED_RETURN_ORIGINS`);

  for (const key of DEV_EDGE_FROM_LOCAL) {
    const fromLocal = local.get(key)?.trim();
    if (!fromLocal) continue;
    const r = setIfMissing(dev, key, fromLocal);
    if (r) changes.push(`${r} ${key} from .env.local`);
  }

  // Drop misplaced UI-only key if present
  if (dev.has('PLATFORM_CONTACT_EMAIL')) {
    dev.delete('PLATFORM_CONTACT_EMAIL');
    changes.push('removed PLATFORM_CONTACT_EMAIL (UI-only → VITE_PLATFORM_CONTACT_EMAIL)');
  }

  const sections = [
    {
      title: 'Dev project',
      keys: ['DEV_PROJECT_REF', 'DEV_SUPABASE_URL', 'DEV_SERVICE_ROLE_KEY', 'PROD_PROJECT_REF'],
    },
    { title: 'Scripts', keys: ['DEV_DB_URL'] },
    { title: 'Env', keys: ['ENVIRONMENT', 'DENO_ENV'] },
    { title: 'URLs', keys: ['PUBLIC_GUEST_APP_ORIGIN', 'PUBLIC_API_URL', 'SUPABASE_PUBLIC_URL'] },
    { title: 'Auth', keys: ['ADMIN_ALLOWED_EMAILS', 'SUPER_ADMIN_EMAILS'] },
    {
      title: 'Email',
      keys: [
        'RESEND_API_KEY',
        'RESEND_FROM_EMAIL',
        'RESEND_INBOUND_WEBHOOK_SECRET',
        'RESEND_APPROVAL_INBOUND_DOMAIN',
        'SUPPORT_TEAM_EMAIL',
      ],
    },
    {
      title: 'Crypto',
      keys: [
        'GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY',
        'SETTINGS_VERIFICATION_SECRET',
        'SUPER_ADMIN_VERIFICATION_SECRET',
      ],
    },
    { title: 'Anti-spam', keys: ['TURNSTILE_SECRET_KEY', 'CAPTCHA_MODE'] },
    {
      title: 'Social fallbacks',
      keys: ['FACEBOOK_REVIEWS_URL', 'AIRBNB_URL', 'INSTAGRAM_URL', 'TIKTOK_URL'],
    },
    { title: 'AI', keys: ['GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GROQ_API_KEY'] },
    {
      title: 'Meta',
      keys: [
        'META_APP_ID',
        'META_APP_SECRET',
        'META_INBOX_TOKEN_ENCRYPTION_KEY',
        'META_WEBHOOK_VERIFY_TOKEN',
        'META_OAUTH_ALLOWED_RETURN_ORIGINS',
        'META_OAUTH_EXCLUDE_PUBLISHING_SCOPES',
        'META_OAUTH_EXTRA_SCOPES',
      ],
    },
    { title: 'PayMongo', keys: ['PAYMONGO_SECRET_KEY', 'PAYMONGO_WEBHOOK_SECRET'] },
    { title: 'Jamendo', keys: ['JAMENDO_CLIENT_ID'] },
    { title: 'Observability', keys: ['POSTHOG_API_KEY', 'POSTHOG_HOST'] },
    { title: 'PWA Web Push', keys: ['VAPID_KEYS', 'VAPID_SUBJECT', 'PUSH_FANOUT_SECRET'] },
    { title: 'Platform email branding', keys: ['PLATFORM_APP_NAME'] },
    {
      title: 'Cron secrets',
      keys: [
        'SD_REFUND_CRON_SECRET',
        'TELEGRAM_CRON_SECRET',
        'TELEGRAM_STAFF_CRON_SECRET',
        'TELEGRAM_ADMIN_CRON_SECRET',
        'TELEGRAM_FINANCE_CRON_SECRET',
        'TELEGRAM_MAINTENANCE_CRON_SECRET',
        'PARKING_BROADCAST_EXPIRE_CRON_SECRET',
        'PARKING_REMINDER_CRON_SECRET',
        'CONTRACT_EXPIRY_CRON_SECRET',
        'DASHBOARD_ASSISTANT_EXPIRE_CRON_SECRET',
        'META_INBOX_WEBHOOK_HEALTHCHECK_CRON_SECRET',
        'PLATFORM_BILLING_CRON_SECRET',
        'CALENDAR_SYNC_CRON_SECRET',
        'SMART_PRICING_CRON_SECRET',
        'SUPERHOST_ASSESSMENT_CRON_SECRET',
      ],
    },
  ];

  if (!SKIP_LOCAL) {
    writeSectionedEnv(devPath, sections, dev);
    console.log(
      `${DRY_RUN ? 'would update' : 'updated'} supabase/.env.dev.local (${changes.length} field changes)`
    );
    for (const c of changes) console.log(`  - ${c}`);
  }

  return dev;
}

function mergeUiDev() {
  const uiDevPath = join(ROOT, 'ui/.env.development');
  const uiHostedPath = join(ROOT, 'ui/.env.development.dev');
  const uiRoot = join(ROOT, 'ui/.env');
  const local = readEnv(uiDevPath);
  const hosted = readEnv(uiHostedPath);
  const shared = readEnv(uiRoot);
  const changes = [];

  setAlways(hosted, 'VITE_NODE_ENV', 'development');
  setAlways(hosted, 'VITE_SUPABASE_URL', `${DEV_SUPABASE_URL}/functions/v1`);
  setAlways(hosted, 'VITE_API_URL', `${DEV_SUPABASE_URL}/functions/v1`);

  for (const key of [
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPER_ADMIN_EMAILS',
    'VITE_GOOGLE_MAPS_API_KEY',
    'VITE_PLATFORM_APP_NAME',
    'VITE_PLATFORM_CONTACT_EMAIL',
    'VITE_VAPID_PUBLIC_KEY',
    'VITE_TURNSTILE_SITE_KEY',
  ]) {
    const src = local.get(key)?.trim() || shared.get(key)?.trim();
    if (!src) continue;
    // Prefer existing hosted anon key if already set (must match fwor…)
    if (key === 'VITE_SUPABASE_ANON_KEY' && hosted.get(key)?.trim()) continue;
    const r = setIfMissing(hosted, key, src);
    if (r) changes.push(`${r} ${key}`);
  }

  for (const key of ['VITE_POSTHOG_KEY', 'VITE_POSTHOG_HOST']) {
    const src = shared.get(key)?.trim() || local.get(key)?.trim();
    if (!src) continue;
    const r = setIfMissing(hosted, key, src);
    if (r) changes.push(`${r} ${key}`);
  }

  // Align super-admin list with local when local is richer
  const localAdmins = local.get('VITE_SUPER_ADMIN_EMAILS')?.trim();
  if (localAdmins && localAdmins.includes(',')) {
    const r = setAlways(hosted, 'VITE_SUPER_ADMIN_EMAILS', localAdmins);
    if (r) changes.push(`${r} VITE_SUPER_ADMIN_EMAILS (from local list)`);
  }

  const sections = [
    { title: 'App', keys: ['VITE_NODE_ENV'] },
    {
      title: 'Supabase',
      keys: ['VITE_SUPABASE_URL', 'VITE_API_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PROJECT_URL'],
    },
    { title: 'Admin UI', keys: ['VITE_SUPER_ADMIN_EMAILS'] },
    {
      title: 'Platform branding (UI only)',
      keys: ['VITE_PLATFORM_APP_NAME', 'VITE_PLATFORM_CONTACT_EMAIL'],
    },
    { title: 'Maps', keys: ['VITE_GOOGLE_MAPS_API_KEY'] },
    { title: 'Anti-spam', keys: ['VITE_TURNSTILE_SITE_KEY'] },
    { title: 'Observability', keys: ['VITE_POSTHOG_KEY', 'VITE_POSTHOG_HOST'] },
    { title: 'PWA', keys: ['VITE_VAPID_PUBLIC_KEY'] },
  ];

  if (!SKIP_LOCAL) {
    writeSectionedEnv(uiHostedPath, sections, hosted);
    console.log(
      `${DRY_RUN ? 'would update' : 'updated'} ui/.env.development.dev (${changes.length} field changes)`
    );
    for (const c of changes) console.log(`  - ${c}`);
  }

  return hosted;
}

/** @param {Map<string, string>} dev */
function pushSupabaseSecrets(dev) {
  if (SKIP_REMOTE) {
    console.log('skip remote supabase secrets');
    return;
  }

  // Confirm linked project is DEV
  const status = spawnSync('bun', ['run', 'env:status'], { cwd: ROOT, encoding: 'utf8' });
  const out = `${status.stdout}\n${status.stderr}`;
  if (!out.includes(DEV_REF) || !out.includes('(dev)')) {
    console.error('Refusing remote secret push — linked project is not multi-tenant DEV:');
    console.error(out.trim());
    process.exit(1);
  }

  const tmpDir = join(ROOT, 'supabase/.temp');
  mkdirSync(tmpDir, { recursive: true });
  const envFile = join(tmpDir, 'dev-secrets-push.env');

  const lines = [];
  for (const [key, value] of [...dev.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (NEVER_PUSH_TO_REMOTE.has(key)) continue;
    if (key.startsWith('DEV_') || key.startsWith('PROD_') || key.startsWith('MT_')) continue;
    if (!value?.trim()) continue;
    const needsQuotes = /[\s#"'\\]/.test(value) || value.includes(',');
    lines.push(needsQuotes ? `${key}='${value.replace(/'/g, "'\\''")}'` : `${key}=${value}`);
  }
  writeFileSync(envFile, `${lines.join('\n')}\n`, 'utf8');
  console.log(`prepared ${lines.length} secrets → ${envFile}`);

  if (DRY_RUN) {
    console.log('dry-run: would run supabase secrets set --env-file …');
    console.log(`dry-run: would unset ${LEGACY_REMOTE_UNSET.join(', ')}`);
    return;
  }

  const setRes = spawnSync('supabase', ['secrets', 'set', '--env-file', envFile], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  console.log(setRes.stdout || '');
  if (setRes.status !== 0) {
    console.error(setRes.stderr || 'secrets set failed');
    process.exit(setRes.status ?? 1);
  }

  const unsetRes = spawnSync('supabase', ['secrets', 'unset', ...LEGACY_REMOTE_UNSET], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  console.log(unsetRes.stdout || '');
  if (unsetRes.status !== 0) {
    console.warn(unsetRes.stderr || 'secrets unset had errors (some may already be gone)');
  }

  console.log('Supabase DEV secrets synced.');
}

console.log(`sync-dev-env ${DRY_RUN ? '(dry-run)' : ''}`);
const dev = mergeDevLocal();
mergeUiDev();

// Reorganize local/edge files to drop denylisted keys (PLATFORM_CONTACT_EMAIL, etc.)
if (!SKIP_LOCAL && !DRY_RUN) {
  const reorg = spawnSync('bun', ['scripts/dev/reorganize-env-files.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  console.log(reorg.stdout || '');
  if (reorg.stderr) console.warn(reorg.stderr);
}

pushSupabaseSecrets(dev);
