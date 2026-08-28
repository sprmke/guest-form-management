#!/usr/bin/env bun
/**
 * Reorganize gitignored env files: keep code-referenced keys only, short section headers.
 * Usage: bun scripts/dev/reorganize-env-files.mjs [--dry-run] [--keep-unmapped]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '../..');
const DRY_RUN = process.argv.includes('--dry-run');
const KEEP_UNMAPPED = process.argv.includes('--keep-unmapped');

const UI_SECTIONS = [
  { title: 'App', keys: ['VITE_NODE_ENV'] },
  {
    title: 'Supabase',
    keys: [
      'VITE_SUPABASE_URL',
      'VITE_API_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_SUPABASE_PROJECT_URL',
    ],
  },
  { title: 'Admin UI', keys: ['VITE_SUPER_ADMIN_EMAILS'] },
  { title: 'Maps', keys: ['VITE_GOOGLE_MAPS_API_KEY'] },
  { title: 'GoTrue (local only)', keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] },
  { title: 'Optional', keys: ['VITE_INBOX_MOCK_DATA'] },
];

const EDGE_SECTIONS = [
  { title: 'Scripts', keys: ['PROD_DB_URL'] },
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
    keys: ['GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY', 'SETTINGS_VERIFICATION_SECRET'],
  },
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
  {
    title: 'Cron secrets',
    keys: [
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
    ],
  },
];

/** @type {Record<string, { path: string; sections: { title: string; keys: string[] }[] }>} */
const SCHEMAS = {
  'ui/.env.development': { path: 'ui/.env.development', sections: UI_SECTIONS },
  'ui/.env.development.dev': {
    path: 'ui/.env.development.dev',
    sections: UI_SECTIONS.filter((s) => s.title !== 'GoTrue (local only)' && s.title !== 'Optional'),
  },
  'ui/.env.production': {
    path: 'ui/.env.production',
    sections: [
      { title: 'App', keys: ['VITE_NODE_ENV'] },
      { title: 'Supabase', keys: ['VITE_SUPABASE_URL', 'VITE_API_URL', 'VITE_SUPABASE_ANON_KEY'] },
    ],
  },
  'supabase/.env.local': { path: 'supabase/.env.local', sections: EDGE_SECTIONS },
  'supabase/.env.dev.local': {
    path: 'supabase/.env.dev.local',
    sections: [
      {
        title: 'Dev project',
        keys: ['DEV_PROJECT_REF', 'DEV_SUPABASE_URL', 'DEV_SERVICE_ROLE_KEY', 'PROD_PROJECT_REF'],
      },
      { title: 'Scripts', keys: ['DEV_DB_URL'] },
      ...EDGE_SECTIONS.filter((s) => s.title !== 'Scripts'),
    ],
  },
  'supabase/.env.production': {
    path: 'supabase/.env.production',
    sections: EDGE_SECTIONS.filter((s) => s.title !== 'Scripts'),
  },
};

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
    map.set(key, value);
  }
  return map;
}

function isPlaceholder(value) {
  return /replace-with|replace-me|your-|from supabase status|<service_role/i.test(value);
}

/** @param {{ sections: { title: string; keys: string[] }[] }} schema @param {Map<string, string>} values */
function renderEnv(schema, values) {
  const used = new Set();
  const lines = [];

  for (const section of schema.sections) {
    const entries = section.keys
      .map((key) => ({ key, value: values.get(key) }))
      .filter((e) => e.value !== undefined && e.value !== '' && !isPlaceholder(e.value));

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
    if (KEEP_UNMAPPED) {
      lines.push('', '# Unused (remove)');
      for (const key of extras) {
        lines.push(`${key}=${values.get(key) ?? ''}`);
      }
    } else {
      console.warn(`  dropped ${extras.length}: ${extras.join(', ')}`);
    }
  }

  return `${lines.join('\n').replace(/^\n+/, '')}\n`;
}

let changed = 0;
for (const schema of Object.values(SCHEMAS)) {
  const abs = join(ROOT, schema.path);
  if (!existsSync(abs)) {
    console.log(`skip: ${schema.path}`);
    continue;
  }
  const before = readFileSync(abs, 'utf8');
  const values = parseEnvFile(before);
  const after = renderEnv(schema, values);
  if (before === after) {
    console.log(`ok: ${schema.path}`);
    continue;
  }
  changed += 1;
  console.log(`${DRY_RUN ? 'would update' : 'updated'}: ${schema.path}`);
  if (!DRY_RUN) writeFileSync(abs, after, 'utf8');
}

console.log(`\n${changed} file(s) ${DRY_RUN ? 'would change' : 'updated'}.`);
