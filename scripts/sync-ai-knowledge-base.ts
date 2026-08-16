#!/usr/bin/env bun
/**
 * Ingests the "Host-facing knowledge" Q&A sections from docs/guides/routes (recursive) markdown files into
 * ai_dashboard_assistant_knowledge_base — the source the AI dashboard assistant's
 * search_knowledge_base tool searches for "how does X work" questions.
 * Docs: docs/workflow/planned/ai-dashboard-assistant.md decision 7, §4.
 *
 * Usage (from repo root):
 *   bun scripts/sync-ai-knowledge-base.ts            # local Supabase (reads ui/.env.development)
 *   bun scripts/sync-ai-knowledge-base.ts --dev       # hosted dev project
 *   bun scripts/sync-ai-knowledge-base.ts --dry-run   # parse + print, no writes
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GUIDES_DIR = join(ROOT, 'docs/guides/routes');

type KnowledgeEntry = {
  routeGuidePath: string;
  routePath: string | null;
  question: string;
  answer: string;
};

function findMarkdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...findMarkdownFiles(full));
    } else if (entry.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

/** Pulls a `Route: /some/path` line from a leading frontmatter/metadata block, if present. */
function extractRoutePath(content: string): string | null {
  const match = content.match(/^Route:\s*(\S+)/m);
  return match ? match[1] : null;
}

function extractHostFacingKnowledge(content: string): KnowledgeEntry[] {
  const headingMatch = content.match(/^## Host-facing knowledge\n/m);
  if (!headingMatch || headingMatch.index === undefined) return [];

  const sectionStart = headingMatch.index + headingMatch[0].length;
  const rest = content.slice(sectionStart);
  const endMatch = rest.match(/\n## |\n---\n/);
  const section = endMatch && endMatch.index !== undefined ? rest.slice(0, endMatch.index) : rest;

  const entries: KnowledgeEntry[] = [];
  const qaPattern = /- Q:\s*(.+?)\n\s+A:\s*([\s\S]*?)(?=\n- Q:|\n\n|$)/g;
  let match: RegExpExecArray | null;
  while ((match = qaPattern.exec(section)) !== null) {
    const question = match[1].trim();
    const answer = match[2].replace(/\s+/g, ' ').trim();
    if (question && answer) {
      entries.push({ routeGuidePath: '', routePath: null, question, answer });
    }
  }
  return entries;
}

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes('--dry-run'),
    dev: argv.includes('--dev'),
  };
}

function loadSupabaseCredentials(dev: boolean): { url: string; key: string } {
  const urlEnv = dev ? 'DEV_SUPABASE_URL' : 'SUPABASE_URL';
  const keyEnv = dev ? 'DEV_SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_SERVICE_ROLE_KEY';
  const url = process.env[urlEnv] ?? (dev ? undefined : 'http://127.0.0.1:54321');
  const key = process.env[keyEnv];
  if (!url || !key) {
    throw new Error(
      `Missing Supabase credentials. Set ${urlEnv} and ${keyEnv} in your shell, or export them from ui/.env.development / ui/.env.development.dev before running.`
    );
  }
  return { url, key };
}

async function main() {
  const { dryRun, dev } = parseArgs(process.argv.slice(2));

  const files = findMarkdownFiles(GUIDES_DIR);
  const entries: KnowledgeEntry[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const routeGuidePath = relative(ROOT, file);
    const routePath = extractRoutePath(content);
    for (const entry of extractHostFacingKnowledge(content)) {
      entries.push({ ...entry, routeGuidePath, routePath });
    }
  }

  console.log(
    `Parsed ${entries.length} Host-facing knowledge Q&A entries from ${files.length} guides.`
  );

  if (dryRun) {
    for (const entry of entries) {
      console.log(`\n[${entry.routeGuidePath}] Q: ${entry.question}\n  A: ${entry.answer}`);
    }
    return;
  }

  if (entries.length === 0) {
    console.log('Nothing to sync — no Host-facing knowledge sections found.');
    return;
  }

  const { url, key } = loadSupabaseCredentials(dev);
  const supabase = createClient(url, key);

  const { error } = await supabase.from('ai_dashboard_assistant_knowledge_base').upsert(
    entries.map((e) => ({
      route_guide_path: e.routeGuidePath,
      route_path: e.routePath,
      question: e.question,
      answer: e.answer,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'route_guide_path,question' }
  );

  if (error) {
    throw new Error(`Failed to upsert knowledge base entries: ${error.message}`);
  }

  console.log(`Synced ${entries.length} entries to ai_dashboard_assistant_knowledge_base.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
