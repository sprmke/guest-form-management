#!/usr/bin/env node
/**
 * Split committable files into N logical batches (~5–20 files each).
 * Run from repo root: node scripts/dev/batch-commit-plan-25.mjs [maxCommits]
 */
import { execSync } from 'node:child_process';

const MAX_COMMITS = Number(process.argv[2] || 30);

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

function bucket(path) {
  if (path.startsWith('supabase/migrations/20261203') ||
      path.startsWith('supabase/migrations/20261204') ||
      path.startsWith('supabase/migrations/20261205') ||
      path.startsWith('supabase/migrations/20261206') ||
      path.startsWith('supabase/migrations/20261207') ||
      path.startsWith('supabase/migrations/20261208')) return 'db-team-rbac';
  if (path.startsWith('supabase/migrations/20261204120000_guest') ||
      path.startsWith('supabase/migrations/20261204120100')) return 'db-support-tickets';
  if (path.startsWith('supabase/migrations/202612091')) return 'db-showcase';
  if (path.startsWith('supabase/migrations/202612101') ||
      path.startsWith('supabase/migrations/202612111') ||
      path.startsWith('supabase/migrations/202612121')) return 'db-plan-tiers';
  if (path.startsWith('supabase/functions/_shared/ownerDefaultParking') ||
      path.startsWith('supabase/functions/_shared/parkingGuestOwnership') ||
      path.startsWith('supabase/functions/resolve-owner-default-parking')) return 'api-owner-parking';
  if (path.startsWith('supabase/functions/get-form-completion') ||
      path.startsWith('supabase/functions/submit-form-completion') ||
      path.startsWith('supabase/functions/issue-guest-form-completion-token')) return 'api-form-completion';
  if (path.includes('sendBookingWorkflowEmail') ||
      path.startsWith('supabase/functions/send-booking-workflow-email')) return 'api-booking-email';
  if (path.includes('metaInboxGraphHttp') || path.includes('socialInboxDb')) return 'api-inbox-shared';
  if (path.startsWith('supabase/migrations/20261128') ||
      path.startsWith('supabase/migrations/20261129') ||
      path.startsWith('supabase/migrations/20261130') ||
      path.startsWith('supabase/migrations/202612011202') ||
      path.startsWith('supabase/migrations/202612021')) return 'db-parking-phases';
  if (path.startsWith('supabase/functions/_shared/accessPermission') ||
      path.startsWith('supabase/functions/_shared/bookingsPermission') ||
      path.startsWith('supabase/functions/_shared/legacyPermission') ||
      path.startsWith('supabase/functions/_shared/opsPermission') ||
      path.startsWith('supabase/functions/_shared/settingsPermission') ||
      path.startsWith('supabase/functions/_shared/settingsPatchPermissions') ||
      path.startsWith('supabase/functions/_shared/propertyTeamTemplates')) return 'api-team-rbac-shared';
  if (path.startsWith('supabase/functions/_shared/parkingPayment') ||
      path.startsWith('supabase/functions/_shared/parkingCancellation') ||
      path.startsWith('supabase/functions/_shared/parkingEndorsement') ||
      path.startsWith('supabase/functions/_shared/parkingPlatform') ||
      path.startsWith('supabase/functions/_shared/parkingDirectLink') ||
      path.startsWith('supabase/functions/_shared/parkingReminder') ||
      path.startsWith('supabase/functions/_shared/paymongoWebhook') ||
      path.startsWith('supabase/functions/_shared/postgrestInChunks')) return 'api-parking-shared';
  if (path.startsWith('supabase/functions/cancel-parking-booking') ||
      path.startsWith('supabase/functions/create-parking-payment-checkout') ||
      path.startsWith('supabase/functions/request-parking-endorsement') ||
      path.startsWith('supabase/functions/send-parking-reminders')) return 'api-parking-fns';
  if (path.startsWith('supabase/functions/parking-payouts') ||
      path.startsWith('supabase/functions/platform-parking-settings')) return 'api-parking-admin';
  if (path.startsWith('supabase/functions/get-public-showcase') ||
      path.includes('publicPageConfigs') ||
      path.includes('customPages')) return 'api-showcase';
  if (path.startsWith('supabase/functions/_shared/brandedEmailShell') ||
      path.includes('email-templates/') ||
      path.includes('emailBrandColor') ||
      path.includes('renderEmailHtml') ||
      path.includes('emailService')) return 'api-email';
  if (path.startsWith('supabase/functions/') && (
      path.includes('support-ticket') || path.includes('submit-support'))) return 'api-support-tickets';
  if (path.startsWith('supabase/functions/apply-org-plan-downgrade')) return 'api-billing';
  if (path.startsWith('supabase/')) return 'api-supabase-misc';
  if (path.includes('features/dashboard/team/') && (
      path.includes('Permission') || path.includes('permission') || path.includes('Template'))) return 'ui-team-rbac';
  if (path.includes('PropertyPlansPage') ||
      path.includes('PublicPagePlanAccessOverlay') ||
      path.includes('ShowcasePlanAccessOverlay')) return 'ui-plans-gates';
  if (path.includes('page-editor') || path.includes('property-showcase')) return 'ui-showcase-editor';
  if (path.includes('OwnerParkingConfirmSheet') ||
      path.includes('useOwnerDefaultParking') ||
      path.includes('useEnsureNeedParking') ||
      path.includes('parkingFindPathFromBooking') ||
      path.includes('useGuestParkingSuccessHref') ||
      path.includes('parkingLinkStay') ||
      path.includes('useCaptureParkingLinkStay')) return 'ui-owner-parking';
  if (path.includes('GuestReviewStarRating') || path.includes('guestReview')) return 'ui-guest-review';
  if (path.includes('bookingWorkflowEmail') || path.includes('sendBookingWorkflowEmail')) return 'ui-booking-email';
  if (path.includes('features/guest/marketing/showcase')) return 'ui-showcase-guest';
  if (path.includes('GuestTickets') || path.includes('account/tickets') || path.includes('guides/routes/account/tickets')) return 'ui-guest-tickets';
  if (path.includes('features/guest/marketing/parkings') ||
      path.includes('features/guest/marketing/pages/Parking') ||
      path.startsWith('ui/src/lib/parking/') ||
      path.startsWith('ui/src/components/parking/')) return 'ui-parking-guest';
  if (path.includes('features/dashboard/parking/') ||
      path.includes('SuperAdminParkingPayouts') ||
      path.includes('usePlatformParkingSettings') ||
      path.includes('ParkingDirectLink')) return 'ui-parking-admin';
  if (path.includes('features/dashboard/bookings/components/calendar/CalendarTime') ||
      path.includes('calendarTimeGrid') ||
      path.includes('CalendarPeriodToggle')) return 'ui-calendar-grid';
  if (path.includes('features/dashboard/bookings/')) return 'ui-bookings';
  if (path.includes('features/dashboard/inbox/')) return 'ui-inbox';
  if (path.includes('features/dashboard/finance/') ||
      path.includes('features/dashboard/maintenance/') ||
      path.includes('lib/pdf/')) return 'ui-finance-pdf';
  if (path.includes('ai-assistant') && (path.includes('Speech') || path.includes('Voice') || path.includes('speechRecognition'))) return 'ui-ai-speech';
  if (path.includes('features/guest/marketing/contact') ||
      path.includes('for-hosts/components/HostDashboardTour') ||
      path.includes('OnboardingFeatureShowcase') ||
      path.includes('HostWorkspaceSidePanel')) return 'ui-marketing-onboarding';
  if (path.includes('features/guest/form/') ||
      path.includes('features/guest/marketing/shared') ||
      path.includes('features/guest/marketing/routes') ||
      path.includes('features/guest/marketing/properties') ||
      path.includes('features/guest/property/')) return 'ui-guest-marketing';
  if (path.startsWith('ui/e2e/features/parking') ||
      path.startsWith('ui/e2e/features/team')) return 'ui-e2e';
  if (path.startsWith('docs/')) return 'docs';
  if (path.startsWith('ui/')) return 'ui-misc';
  if (path.startsWith('.cursor/') || path.startsWith('.agent/')) return 'tooling';
  if (path === 'package.json' || path === 'bun.lock' || path === 'playwright.config.ts') return 'deps';
  if (path.startsWith('scripts/')) return 'scripts';
  return 'misc';
}

const groups = new Map();
for (const file of files) {
  const b = bucket(file);
  if (!groups.has(b)) groups.set(b, []);
  groups.get(b).push(file);
}

const ORDER = [
  ['db-plan-tiers', 'database(supabase): add plan tier and public pages migrations'],
  ['db-team-rbac', 'database(supabase): add property team granular permission migrations'],
  ['db-support-tickets', 'database(supabase): add guest support tickets schema'],
  ['db-showcase', 'database(supabase): add property showcase page migrations'],
  ['db-parking-phases', 'database(supabase): add parking payment and platform migrations'],
  ['api-team-rbac-shared', 'api(supabase): add property team permission expansion helpers'],
  ['api-parking-shared', 'api(supabase): add parking payment orchestration shared services'],
  ['api-parking-fns', 'api(supabase): add parking payment cancel and endorsement endpoints'],
  ['api-parking-admin', 'api(supabase): add platform parking settings and payout ledger'],
  ['api-showcase', 'api(supabase): add public property showcase endpoint'],
  ['api-email', 'api(supabase): unify branded email shell and template rendering'],
  ['api-support-tickets', 'api(supabase): extend guest support ticket endpoints'],
  ['api-billing', 'api(supabase): add org plan downgrade handler'],
  ['api-owner-parking', 'api(supabase): add owner default parking resolution'],
  ['api-form-completion', 'api(supabase): add guest form completion token flow'],
  ['api-booking-email', 'api(supabase): add booking workflow email sender'],
  ['api-inbox-shared', 'api(supabase): extend meta inbox graph helpers'],
  ['api-supabase-misc', 'api(supabase): sync shared services and edge function updates'],
  ['ui-team-rbac', 'ui(org): add granular property team permissions ui'],
  ['ui-showcase-editor', 'ui(ui): add property showcase page editor'],
  ['ui-showcase-guest', 'ui(guest-form): add property showcase public templates'],
  ['ui-guest-tickets', 'ui(guest-form): add guest support tickets hub'],
  ['ui-parking-guest', 'ui(guest-form): extend parking marketplace guest flows'],
  ['ui-parking-admin', 'ui(org): add parking payouts and direct booking admin ui'],
  ['ui-owner-parking', 'ui(bookings): add owner default parking booking flows'],
  ['ui-plans-gates', 'ui(org): add plan tier access overlays and property plans'],
  ['ui-guest-review', 'ui(guest-form): add guest review star rating component'],
  ['ui-booking-email', 'ui(bookings): wire booking workflow email actions'],
  ['ui-calendar-grid', 'ui(bookings): add calendar time grid and period toggle'],
  ['ui-bookings', 'ui(bookings): sync booking workflow and calendar updates'],
  ['ui-inbox', 'ui(inbox): polish inbox thread and conversation views'],
  ['ui-finance-pdf', 'ui(finance): polish finance and maintenance pdf exports'],
  ['ui-ai-speech', 'ui(ui): add dashboard assistant speech to text'],
  ['ui-marketing-onboarding', 'ui(guest-form): add contact page and onboarding showcase'],
  ['ui-guest-marketing', 'ui(guest-form): refine guest marketing routes and property pages'],
  ['ui-e2e', 'test(ui): extend parking and team playwright coverage'],
  ['ui-misc', 'ui(ui): sync dashboard shell components and styles'],
  ['docs', 'docs(docs): sync architecture route guides and shipped workflow docs'],
  ['deps', 'chore(deps): update root and ui package locks'],
  ['scripts', 'chore(*): add dev utilities and update scripts readme'],
  ['tooling', 'chore(*): sync agent skills and cursor rules'],
  ['misc', 'chore(*): sync remaining project config'],
];

const batches = ORDER.filter(([key]) => groups.has(key) && groups.get(key).length > 0)
  .map(([key, message]) => ({ message, files: groups.get(key) }));

// Merge small trailing batches if we exceed MAX_COMMITS
while (batches.length > MAX_COMMITS) {
  const last = batches.pop();
  batches[batches.length - 1].files.push(...last.files);
}

// Split large batches until we reach target commit count
while (batches.length < MAX_COMMITS) {
  const idx = batches.findIndex((b) => b.files.length > 30);
  if (idx === -1) break;
  const batch = batches[idx];
  const half = Math.ceil(batch.files.length / 2);
  const a = batch.files.slice(0, half);
  const b = batch.files.slice(half);
  batches.splice(idx, 1, 
    { message: batch.message.replace('sync', 'sync batch 1'), files: a },
    { message: batch.message.replace('sync', 'sync batch 2'), files: b }
  );
}

const total = batches.reduce((n, b) => n + b.files.length, 0);
console.log(JSON.stringify({ totalFiles: total, batchCount: batches.length, batches: batches.map(b => ({ message: b.message, count: b.files.length })) }, null, 2));

// Write shell script
const sh = ['#!/bin/bash', 'set -euo pipefail', ''];
for (const batch of batches) {
  sh.push(`git add -- ${batch.files.map(f => `'${f.replace(/'/g, "'\\''")}'`).join(' ')}`);
  sh.push(`git commit -m "${batch.message.replace(/"/g, '\\"')}"`);
  sh.push(`echo "OK: ${batch.message} (${batch.files.length} files)"`);
  sh.push('');
}
sh.push('echo "DONE ${#batches} commits"');

import { writeFileSync } from 'node:fs';
writeFileSync('scripts/dev/batch-commit-run.sh', sh.join('\n'), { mode: 0o755 });
console.error('Wrote scripts/dev/batch-commit-run.sh');
