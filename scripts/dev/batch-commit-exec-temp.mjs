#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SKIP = new Set([
  '.claude/settings.local.json',
  'ui/screen-tmp/.gitkeep',
]);

const MESSAGES = {
  1: 'feat(ui): add ai assistant turn progress and activity blocks',
  2: 'feat(ui): add ai assistant stream client helpers',
  3: 'fix(bookings): sync booking detail upload and workflow hooks',
  4: 'feat(bookings): add guest form completion link hook',
  5: 'feat(inbox): refactor share picker into insert menu',
  6: 'feat(inbox): add pinned snippets and check-in pack libs',
  7: 'fix(ui): sync notification display helpers',
  8: 'fix(org): update property settings form sections',
  9: 'fix(org): sync org settings save and location libs',
  10: 'fix(org): add amenities manage dialog',
  11: 'feat(org): add guest rewards and voucher settings ui',
  12: 'feat(ui): add stay guide template page editor',
  13: 'fix(org): sync plan presentation and upgrade modal',
  14: 'feat(org): add calendar sync dialog and api',
  15: 'fix(org): update property permissions catalog',
  16: 'docs(docs): sync architecture and ops docs',
  17: 'docs(docs): sync route guides batch one',
  18: 'docs(docs): sync route guides batch two',
  19: 'docs(docs): add vouchers and testing guides',
  20: 'docs(docs): update docs readme index',
  21: 'docs(docs): sync intake and in-progress workflow docs',
  22: 'docs(docs): sync qa property dashboard guides',
  23: 'docs(docs): add shipped feature workflow records',
  24: 'docs(docs): add in-progress and planned workflow docs',
  25: 'feat(guest-form): add guest vouchers page and discount lib',
  26: 'feat(guest-form): add guest chat insert menu and resource hub',
  27: 'feat(guest-form): add voucher picker on guest form',
  28: 'fix(guest-form): add showcase compact header nav',
  29: 'feat(guest-form): add sd form voucher reveal components',
  30: 'feat(guest-form): add voucher reveal wheel and motion libs',
  31: 'feat(guest-form): add stay guide config v2 mapping',
  32: 'chore(*): sync agent skills and ci workflow',
  33: 'test(ui): extend parking e2e specs and vitest config',
  34: 'chore(*): add batch commit and qa probe scripts',
  35: 'chore(*): add media quality scripts and calendar sync fns',
  36: 'api(supabase): extend booking and form edge functions',
  37: 'api(supabase): add guest vouchers and form completion endpoints',
  38: 'api(supabase): add inbox chat asset upload endpoint',
  39: 'database(supabase): add stay guide and calendar sync migrations',
  40: 'database(supabase): add voucher migrations and config updates',
  41: 'api(supabase): sync shared booking and guest services',
  42: 'api(supabase): sync voucher and calendar sync shared services',
  43: 'api(supabase): add guest form completion and voucher redemption',
  44: 'chore(*): sync cursor rules and chat components',
  45: 'feat(ui): add client image optimization pipeline',
  46: 'feat(ui): add upload limits and prepare upload helpers',
};

const planJson = execSync(
  'node .agent/skills/batch-commit/scripts/plan-commits.mjs --commits 46 --min 5 --max 10',
  { encoding: 'utf8', cwd: process.cwd() },
);
const plan = JSON.parse(planJson);

let ok = 0;
for (const batch of plan.dailyPlan) {
  const paths = batch.paths
    .map((p) => (p === 'agent/skills/minimal-ui-copy/SKILL.md' ? '.agent/skills/minimal-ui-copy/SKILL.md' : p))
    .filter((p) => !SKIP.has(p));

  if (paths.length === 0) continue;

  const msg = MESSAGES[batch.index] ?? `chore: batch ${batch.index} ${batch.bucket}`;
  const addArgs = paths.map((p) => `'${p.replace(/'/g, "'\\''")}'`).join(' ');

  try {
    execSync(`git add -- ${addArgs}`, { stdio: 'inherit' });
    execSync(`git commit -m "${msg.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
    console.log(`OK ${batch.index}: ${msg} (${paths.length} files)`);
    ok++;
  } catch (e) {
    console.error(`FAILED at batch ${batch.index}: ${msg}`);
    process.exit(1);
  }
}

console.log(`\nDONE ${ok} commits`);
