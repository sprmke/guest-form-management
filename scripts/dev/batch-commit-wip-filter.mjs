#!/usr/bin/env node
/** Lists committable paths from git status, excluding WIP. */
import { execSync } from 'node:child_process';

const EXCLUDE = [
  /^\.claude\/settings\.local\.json$/,
  /^docs\/\.obsidian\//,
  /^docs\/workflow\/intake\//,
  /^docs\/workflow\/in-progress\//,
  /^docs\/workflow\/planned\/parking-e2e-phase/,
  /^docs\/workflow\/planned\/parking-e2e-production-readiness/,
  /^docs\/workflow\/planned\/image-video-upload-optimization/,
  /^ui\/vite\.config\.ts\.timestamp-/,
  /^ui\/screen-tmp\//,
  /^no-facebook-login\.png$/,
  /^scripts\/dev\/seed-monaco/,
  /^scripts\/dev\/batch-commit-/,
  /^scripts\/media\//,
  /^deno\.lock$/,
  /^ui\/vitest\.config\.ts$/,
  /^ui\/src\/lib\/media\//,
  /^supabase\/functions\/calendar-sync/,
  /^supabase\/functions\/ical-export/,
  /calendarSync/,
  /^supabase\/migrations\/202612131/,
  /ChannelSyncCard/,
  /useCalendarSync/,
  /calendarSyncApi/,
  /^supabase\/migrations\/20261210120100/,
  /^supabase\/migrations\/20261210120300/,
  /page-editor\/components\/stay-guide\//,
  /page-editor\/lib\/stayGuideTemplate/,
  /showcase\/templates\/shared\/StayGuideSections/,
  /preview-guest-stay-guide/,
  /features\/guest\/stay-guide\//,
];

const raw = execSync('git status --porcelain=v1 -uall', { encoding: 'utf8' }).trim();
const files = raw
  .split('\n')
  .filter(Boolean)
  .map((line) => line.slice(3).replace(/^"|"$/g, '').split(' -> ').pop().trim())
  .filter((path) => !EXCLUDE.some((re) => re.test(path)));

console.log(JSON.stringify({ count: files.length, files }, null, 0));
