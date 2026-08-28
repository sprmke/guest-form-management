#!/usr/bin/env node
/** Lists committable paths from git status, excluding WIP. */
import { execSync } from 'node:child_process';

const EXCLUDE = [
  /^\.claude\/settings\.local\.json$/,
  /^docs\/\.obsidian\//,
  /^docs\/workflow\/intake\//,
  /^docs\/workflow\/in-progress\/parking-e2e-phase/,
  /^docs\/workflow\/in-progress\/marketing-module-refinement\.md$/,
  /^docs\/workflow\/in-progress\/org-granular-team-permissions\.md$/,
  /^ui\/vite\.config\.ts\.timestamp-/,
  /^docs\/workflow\/planned\/parking-e2e-phase6/,
  /^docs\/workflow\/planned\/parking-e2e-production-readiness/,
  /^docs\/workflow\/planned\/org-granular-team-permissions\.md$/,
  /^ui\/screen-tmp\//,
  /^no-facebook-login\.png$/,
  /^scripts\/dev\/seed-monaco/,
];

const raw = execSync('git status --porcelain=v1 -uall', { encoding: 'utf8' }).trim();
const files = raw
  .split('\n')
  .filter(Boolean)
  .map((line) => line.slice(3).replace(/^"|"$/g, '').split(' -> ').pop().trim())
  .filter((path) => !EXCLUDE.some((re) => re.test(path)));

console.log(JSON.stringify({ count: files.length, files }, null, 0));
