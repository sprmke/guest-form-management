#!/usr/bin/env node
/**
 * Re-sort intake scratchpad blocks: ❌ → ✅ → 📋 → 🚧 → 🔵
 * Preserves block format: === \n\n <title> \n <body> \n ===
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILES = [
  path.join(ROOT, 'docs/workflow/intake/_to-prompt.md'),
  path.join(ROOT, 'docs/workflow/intake/_to-plan.md'),
];

const RANK = { '❌': 0, '✅': 1, '📋': 2, '🚧': 3, '🔵': 4 };
const EMOJI_RE = /^(✅|🚧|📋|🔵|❌)\s+/;

function parseScratchpad(content) {
  const normalized = content.replace(/^[ \t]*\\===\s*$/gm, '===');
  const marker = '\n===\n\n';
  const first = normalized.indexOf(marker);
  if (first === -1) {
    throw new Error('No scratchpad blocks found');
  }

  const header = normalized.slice(0, first);
  const rest = normalized.slice(first + marker.length);
  const rawBlocks = rest.split(marker);

  const blocks = rawBlocks.map((raw, idx) => {
    const trimmed = raw.replace(/\n===\s*$/, '').trimEnd();
    const lines = trimmed.split('\n');
    let titleIdx = 0;
    while (titleIdx < lines.length && lines[titleIdx].trim() === '') titleIdx += 1;
    const title = lines[titleIdx] ?? '';
    const m = title.match(EMOJI_RE);
    const rank = m ? (RANK[m[1]] ?? 99) : 99;
    return { rank, idx, body: trimmed };
  });

  blocks.sort((a, b) => a.rank - b.rank || a.idx - b.idx);
  const rebuilt =
    header +
    marker +
    blocks.map((b) => `${b.body}\n===`).join('\n\n') +
    (normalized.endsWith('\n') ? '\n' : '');

  return rebuilt;
}

for (const file of FILES) {
  const original = fs.readFileSync(file, 'utf8');
  const next = parseScratchpad(original);
  fs.writeFileSync(file, next, 'utf8');
  console.log('Reordered', path.relative(ROOT, file));
}
