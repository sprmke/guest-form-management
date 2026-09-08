#!/usr/bin/env node
/**
 * Split committable files into N logical batches (~5–20 files each).
 * Run from repo root: node scripts/dev/batch-commit-plan-25.mjs [maxCommits]
 */
import { execSync } from 'node:child_process';

const MAX_COMMITS = Number(process.argv[2] || 40);

const EXCLUDE = [
  /^\.claude\/settings\.local\.json$/,
  /^docs\/\.obsidian\//,
  /^docs\/planning\//,
  /^docs\/workflow\/intake\//,
  /^docs\/workflow\/in-progress\//,
  /^docs\/workflow\/planned\/parking-e2e-phase/,
  /^docs\/workflow\/planned\/parking-e2e-production-readiness/,
  /^docs\/workflow\/planned\/image-video-upload-optimization/,
  /^docs\/workflow\/planned\/ai-assistant-bulk/,
  /^docs\/workflow\/planned\/ai-assistant-parking/,
  /^docs\/workflow\/planned\/ai-assistant-settings/,
  /^docs\/workflow\/planned\/guest-trust/,
  /^docs\/workflow\/planned\/marketing-studio-mobile/,
  /^ui\/vite\.config\.ts\.timestamp-/,
  /^ui\/screen-tmp\//,
  /^preview-hero\.png$/,
  /^no-facebook-login\.png$/,
  /^scripts\/dev\/seed-monaco/,
  /^scripts\/dev\/batch-commit-/,
  /^scripts\/dev\/run-assistant-parity/,
  /^scripts\/media\//,
  /^deno\.lock$/,
  /^ui\/vitest\.config\.ts$/,
  /^ui\/src\/lib\/media\//,
  /^\.claude\/skills\/integration-javascript_web\//,
];

const raw = execSync('git status --porcelain=v1 -uall', { encoding: 'utf8' }).trim();
const files = raw
  .split('\n')
  .filter(Boolean)
  .map((line) => line.slice(3).replace(/^"|"$/g, '').split(' -> ').pop().trim())
  .filter((path) => !EXCLUDE.some((re) => re.test(path)));

function bucket(path) {
  if (path.startsWith('supabase/migrations/202613031') ||
      path.startsWith('supabase/migrations/20261304120000')) return 'db-push-idempotency';
  if (path.includes('antiSpam') || path.includes('captcha') ||
      path.includes('rateLimit') || path.includes('botHeuristics')) return 'api-captcha';
  if (path.includes('webPush') || path.includes('pushRecipients') ||
      path.startsWith('supabase/functions/push-')) return 'api-push';
  if (path.includes('dashboardAssistant') && path.includes('Tools')) return 'api-ai-tools';
  if (path.endsWith('Upload.ts') || path.includes('AssetUpload')) return 'api-upload-helpers';
  if (path.includes('orgBillingUrls') || path.includes('orgPaymentReconcile') ||
      path.includes('orgSubscriptionCheckout') || path.includes('create-org-subscription')) return 'api-billing';
  if (path.startsWith('ui/src/pwa/') || path.startsWith('ui/src/lib/pwa/') ||
      path.startsWith('ui/src/components/pwa/') || path.includes('pwa-version') ||
      path.includes('offline.html') || path.startsWith('ui/public/icons/')) return 'ui-pwa';
  if (path.startsWith('ui/src/lib/security/') ||
      path.startsWith('ui/src/components/security/')) return 'ui-guest-security';
  if (path.includes('orgPlanCheckout') || path.includes('PlanUpgradeSuccess') ||
      path.includes('PlanCheckoutConfirmation') || path.includes('openOrgPlanCheckout')) return 'ui-plans-billing';
  if (path.startsWith('ui/src/components/mobile/') ||
      path.includes('AdminMobileHero') || path.includes('BottomTabBar') ||
      path.includes('FloatingPanel') || path.includes('AdminMoreSheet') ||
      path.includes('AdminSectionNavLayout') || path.includes('AdminLayout')) return 'ui-mobile-shell';
  if (path.startsWith('ui/e2e/features/assistant')) return 'ui-e2e-assistant';
  if (path.startsWith('supabase/functions/tests/assistant')) return 'api-ai-tests';
  if (path.startsWith('supabase/migrations/20261231120000') ||
      path.startsWith('supabase/migrations/20261231130100') ||
      path.startsWith('supabase/migrations/20261231130200')) return 'db-superhost';
  if (path.startsWith('supabase/migrations/2026123114') ||
      path.startsWith('supabase/migrations/2026123115')) return 'db-platform-settings';
  if (path.startsWith('supabase/migrations/20261302120000')) return 'db-support-tickets-ext';
  if (path.includes('OrgSuperhostProgress') || path.includes('orgSuperhost.ts') ||
      path.includes('useOrgSuperhostProgress')) return 'ui-superhost';
  if ((path.includes('superhost') || path.includes('Superhost')) &&
      path.startsWith('supabase/')) return 'api-superhost';
  if (path.includes('hostAnnouncements') ||
      path.startsWith('supabase/functions/list-host-announcements')) return 'api-announcements';
  if (path.includes('marketingGuestReviews') ||
      path.startsWith('supabase/functions/list-property-guest-reviews')) return 'api-marketing-reviews';
  if (path.includes('platformHostSettings') ||
      path.includes('platform-host-settings')) return 'api-platform-settings';
  if (path.includes('developmentGuestInfo') ||
      path.startsWith('supabase/functions/update-development')) return 'api-development';
  if (path.includes('supportTicket') ||
      path.includes('support-ticket')) return 'api-support-tickets';
  if (path.startsWith('supabase/migrations/202612131') ||
      path.startsWith('supabase/migrations/202612141')) return 'db-calendar-sync';
  if (path.startsWith('supabase/functions/calendar-sync') ||
      path.startsWith('supabase/functions/ical-export') ||
      path.includes('calendarSync')) return 'api-calendar-sync';
  if (path.includes('dashboardAssistant') ||
      path.startsWith('supabase/functions/dashboard-assistant') ||
      path.includes('features/dashboard/ai-assistant')) return 'api-ai-assistant';
  if (path.includes('voucher') || path.includes('Voucher')) return 'ui-vouchers';
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
      path.includes('submit-support'))) return 'api-support-tickets';
  if (path.startsWith('supabase/functions/apply-org-plan-downgrade')) return 'api-billing';
  if (path.startsWith('supabase/')) return 'api-supabase-misc';
  if (path.includes('features/dashboard/announcements')) return 'ui-announcements';
  if (path.includes('OrgSuperhostProgress') || path.includes('orgSuperhost')) return 'ui-superhost';
  if (path.includes('marketingGuestReview') ||
      path.includes('MarketingReviewSidebar') ||
      path.includes('usePropertyGuestReviews')) return 'ui-marketing-reviews';
  if (path.includes('features/guest/stay-guide') ||
      path.includes('StayGuideSections')) return 'ui-stay-guide';
  if (path.includes('for-hosts') ||
      path.includes('hostTour') ||
      path.includes('for-hosts/narration')) return 'ui-for-hosts-tour';
  if (path.includes('help-support') ||
      path.includes('SupportTicket') ||
      path.includes('supportTicket')) return 'ui-support-tickets';
  if (path.includes('super-admin') &&
      (path.includes('Announcement') ||
        path.includes('PlatformHost') ||
        path.includes('DevelopmentGuestInfo') ||
        path.includes('developmentGuestInfo'))) return 'ui-super-admin';
  if (path.includes('features/dashboard/marketing/')) return 'ui-marketing';
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
  if (path.includes('ChannelSyncCard') ||
      path.includes('useCalendarSync') ||
      path.includes('calendarSyncApi') ||
      path.includes('features/dashboard/pricing/')) return 'ui-calendar-sync';
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
  ['db-push-idempotency', 'database(supabase): add push subscriptions and idempotency migrations'],
  ['db-superhost', 'database(supabase): add superhost assessment migrations'],
  ['db-platform-settings', 'database(supabase): add platform host settings migrations'],
  ['db-support-tickets-ext', 'database(supabase): extend support ticket attachment types'],
  ['db-calendar-sync', 'database(supabase): add airbnb calendar sync migrations'],
  ['db-plan-tiers', 'database(supabase): add plan tier and public pages migrations'],
  ['db-team-rbac', 'database(supabase): add property team granular permission migrations'],
  ['db-support-tickets', 'database(supabase): add guest support tickets schema'],
  ['db-showcase', 'database(supabase): add property showcase page migrations'],
  ['db-parking-phases', 'database(supabase): add parking payment and platform migrations'],
  ['api-captcha', 'api(supabase): add captcha anti-spam and rate limiting'],
  ['api-push', 'api(supabase): add web push subscribe and fanout endpoints'],
  ['api-ai-tools', 'api(supabase): extend dashboard assistant tool catalog'],
  ['api-ai-tests', 'test(supabase): add dashboard assistant parity tests'],
  ['api-upload-helpers', 'api(supabase): add shared upload helper services'],
  ['api-billing', 'api(supabase): add org subscription checkout and reconcile'],
  ['api-superhost', 'api(supabase): add earned superhost assessment endpoints'],
  ['api-announcements', 'api(supabase): add host announcements list endpoint'],
  ['api-marketing-reviews', 'api(supabase): add marketing guest review services'],
  ['api-platform-settings', 'api(supabase): add platform host settings endpoints'],
  ['api-development', 'api(supabase): extend development guest info updates'],
  ['api-calendar-sync', 'api(supabase): add calendar sync and ical export endpoints'],
  ['api-ai-assistant', 'api(supabase): add dashboard ai assistant services'],
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
  ['ui-pwa', 'feat(ui): add installable pwa shell and service worker'],
  ['ui-guest-security', 'feat(guest-form): add turnstile captcha on public submits'],
  ['ui-plans-billing', 'feat(org): add paymongo plan checkout return flow'],
  ['ui-mobile-shell', 'feat(ui): refine mobile admin shell and navigation'],
  ['ui-e2e-assistant', 'test(ui): add dashboard assistant live e2e specs'],
  ['ui-superhost', 'ui(org): add org superhost progress trust section'],
  ['ui-announcements', 'ui(org): add host announcements dashboard module'],
  ['ui-marketing-reviews', 'ui(org): add marketing guest review studio sidebar'],
  ['ui-marketing', 'ui(org): sync marketing studio design and video editor'],
  ['ui-stay-guide', 'ui(guest-form): add stay guide showcase template parity'],
  ['ui-for-hosts-tour', 'ui(guest-form): extend for-hosts dashboard film tour'],
  ['ui-support-tickets', 'ui(org): polish help support ticket workspace'],
  ['ui-super-admin', 'ui(admin): add announcements and platform host settings'],
  ['ui-vouchers', 'ui(org): add voucher redemption and reveal styles'],
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
  ['ui-calendar-sync', 'ui(org): add channel calendar sync pricing ui'],
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

const TARGET_BATCH = 12;

function mergeSmallestPair(list) {
  if (list.length < 2) return list;
  const sorted = [...list].sort((a, b) => a.files.length - b.files.length);
  const a = sorted[0];
  const b = sorted[1];
  const merged = {
    message: a.message.length <= b.message.length ? a.message : b.message,
    files: [...a.files, ...b.files],
  };
  const rest = list.filter((x) => x !== a && x !== b);
  rest.push(merged);
  return rest;
}

function splitOversized(list) {
  const out = [];
  for (const batch of list) {
    if (batch.files.length <= TARGET_BATCH) {
      out.push(batch);
      continue;
    }
    let remaining = [...batch.files];
    let slice = 1;
    while (remaining.length > 0) {
      const chunk = remaining.splice(0, TARGET_BATCH);
      const suffix = remaining.length > 0 ? ` batch ${slice}` : '';
      out.push({ message: `${batch.message}${suffix}`, files: chunk });
      slice += 1;
    }
  }
  return out;
}

let normalized = splitOversized(batches);

while (normalized.length > MAX_COMMITS) {
  normalized = mergeSmallestPair(normalized);
}

while (normalized.length < MAX_COMMITS) {
  const idx = normalized.findIndex((b) => b.files.length > TARGET_BATCH);
  if (idx === -1) break;
  const batch = normalized[idx];
  const half = Math.ceil(batch.files.length / 2);
  const a = batch.files.slice(0, half);
  const b = batch.files.slice(half);
  const base = batch.message.replace(/ batch \d+$/, '');
  normalized.splice(idx, 1,
    { message: `${base} batch 1`, files: a },
    { message: `${base} batch 2`, files: b }
  );
}

const finalBatches = normalized.slice(0, MAX_COMMITS);

const total = finalBatches.reduce((n, b) => n + b.files.length, 0);
console.log(JSON.stringify({ totalFiles: total, batchCount: finalBatches.length, batches: finalBatches.map(b => ({ message: b.message, count: b.files.length })) }, null, 2));

// Write shell script
const sh = ['#!/bin/bash', 'set -euo pipefail', ''];
for (const batch of finalBatches) {
  sh.push(`git add -- ${batch.files.map(f => `'${f.replace(/'/g, "'\\''")}'`).join(' ')}`);
  sh.push(`git commit -m "${batch.message.replace(/"/g, '\\"')}"`);
  sh.push(`echo "OK: ${batch.message} (${batch.files.length} files)"`);
  sh.push('');
}
sh.push('echo "DONE ${#batches} commits"');

import { writeFileSync } from 'node:fs';
writeFileSync('scripts/dev/batch-commit-run.sh', sh.join('\n'), { mode: 0o755 });
console.error('Wrote scripts/dev/batch-commit-run.sh');
