/**
 * Mocked property-team RBAC harness — nav visibility + route guards.
 * Mirrors seeded Full Access / Operations / Read Only grants (Phase 7 catalog).
 */

import { expect, type Page, type Route } from '@playwright/test';

const ORG_ID = 'org-team-e2e-001';
export const TEAM_E2E_PROPERTY_ID = 'property-team-e2e-001';
export const TEAM_E2E_ORG_SLUG = 'kame-homes-ph';
export const TEAM_E2E_PROPERTY_SLUG = 'solea-mactan';

const SUPABASE_AUTH_STORAGE_KEY = 'sb-127-auth-token';

type AssistantChatBlock = {
  type: string;
  [key: string]: unknown;
};

let assistantChatBlocks: AssistantChatBlock[] = [];

/** Set mocked assistant turn blocks for the next dashboard-assistant-chat POST. */
export function queueAssistantChatBlocksForMocks(blocks: AssistantChatBlock[]) {
  assistantChatBlocks = blocks;
}

/** Full Access — all leaf ids (subset representative of catalog modules for nav). */
export const FULL_ACCESS_PERMISSIONS = [
  'bookings:view',
  'bookings.create:add',
  'bookings.import:add',
  'bookings.detail.stay:edit',
  'bookings.detail.guests:edit',
  'bookings.detail.parking:edit',
  'bookings.detail.pets:edit',
  'bookings.detail.pricing:edit',
  'bookings.detail.workflow:edit',
  'finance:view',
  'finance.transactions:add',
  'finance.transactions:edit',
  'finance.transactions:delete',
  'finance.export:view',
  'pricing:view',
  'pricing.rates:edit',
  'pricing.blocks:add',
  'pricing.blocks:delete',
  'maintenance:view',
  'maintenance.reminders:add',
  'maintenance.reminders:edit',
  'maintenance.reminders:delete',
  'maintenance.export:view',
  'marketing:view',
  'marketing.content:add',
  'marketing.content:edit',
  'marketing.templates:add',
  'marketing.templates:edit',
  'marketing.templates:delete',
  'marketing.generate:add',
  'marketing.publish:add',
  'notifications:view',
  'notifications.chat:edit',
  'notifications.marketing:edit',
  'notifications.staff:edit',
  'notifications.operations:edit',
  'notifications.finance:edit',
  'notifications.maintenance:edit',
  'templates:view',
  'templates.standard:edit',
  'templates.email:edit',
  'templates.custom:add',
  'templates.custom:edit',
  'templates.custom:delete',
  'publicPages:view',
  'publicPages.property:edit',
  'publicPages.stayGuide:edit',
  'publicPages.showcase:edit',
  'settings:view',
  'settings.basicInfo:edit',
  'team:view',
  'team.invitations:add',
  'team.members:edit',
  'inbox:view',
  'inbox.messages:edit',
  'inbox.channels:add',
] as const;

/** Operations seeded template (ex-Staff) — includes Marketing; excludes Finance/Settings/Team manage. */
export const OPERATIONS_PERMISSIONS = [
  'bookings:view',
  'bookings.create:add',
  'bookings.detail.stay:edit',
  'bookings.detail.guests:edit',
  'bookings.detail.parking:edit',
  'bookings.detail.pets:edit',
  'bookings.detail.pricing:edit',
  'bookings.detail.workflow:edit',
  'maintenance:view',
  'maintenance.reminders:add',
  'maintenance.reminders:edit',
  'maintenance.reminders:delete',
  'maintenance.export:view',
  'notifications:view',
  'templates:view',
  'publicPages:view',
  'pricing:view',
  'inbox:view',
  'inbox.messages:edit',
  'marketing:view',
  'marketing.content:add',
  'marketing.content:edit',
  'marketing.templates:add',
  'marketing.templates:edit',
  'marketing.templates:delete',
  'marketing.generate:add',
  'marketing.publish:add',
] as const;

/** Read Only seeded template — no Marketing, Finance, Settings. */
export const READ_ONLY_PERMISSIONS = [
  'bookings:view',
  'maintenance:view',
  'notifications:view',
  'templates:view',
  'publicPages:view',
  'pricing:view',
  'team:view',
  'inbox:view',
] as const;

export type TeamRbacTemplate = 'full_access' | 'operations' | 'read_only';

export const teamRbacPaths = {
  /** Property dashboard index (KPI widgets — prefer `bookings` for shell/nav smoke). */
  dashboard: `/org/${TEAM_E2E_ORG_SLUG}/property/${TEAM_E2E_PROPERTY_SLUG}`,
  bookings: `/org/${TEAM_E2E_ORG_SLUG}/property/${TEAM_E2E_PROPERTY_SLUG}/bookings`,
  finance: `/org/${TEAM_E2E_ORG_SLUG}/property/${TEAM_E2E_PROPERTY_SLUG}/finance`,
  marketing: `/org/${TEAM_E2E_ORG_SLUG}/property/${TEAM_E2E_PROPERTY_SLUG}/marketing`,
  settings: `/org/${TEAM_E2E_ORG_SLUG}/property/${TEAM_E2E_PROPERTY_SLUG}/settings`,
  team: `/org/${TEAM_E2E_ORG_SLUG}/property/${TEAM_E2E_PROPERTY_SLUG}/team`,
} as const;

function permissionsForTemplate(template: TeamRbacTemplate): readonly string[] {
  if (template === 'full_access') return FULL_ACCESS_PERMISSIONS;
  if (template === 'operations') return OPERATIONS_PERMISSIONS;
  return READ_ONLY_PERMISSIONS;
}

function e2eSupabaseAuthSession() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    access_token: 'playwright-team-token',
    refresh_token: 'playwright-team-refresh',
    expires_in: 60 * 60,
    expires_at: nowSeconds + 60 * 60,
    token_type: 'bearer',
    user: {
      id: 'user-team-e2e-001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'team-member@example.com',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: { full_name: 'Team Member' },
      identities: [],
      created_at: new Date(0).toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function organizationList() {
  return {
    organizations: [
      {
        id: ORG_ID,
        name: 'Kame Homes PH',
        slug: TEAM_E2E_ORG_SLUG,
        description: null,
        logoUrl: null,
        settings: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };
}

function propertyList() {
  return {
    properties: [
      {
        id: TEAM_E2E_PROPERTY_ID,
        organizationId: ORG_ID,
        name: 'Solea Mactan',
        slug: TEAM_E2E_PROPERTY_SLUG,
        type: 'condo',
        status: 'ACTIVE',
        address: 'Mactan',
        towerAndUnit: null,
        tower: 'Tower A',
        unitNumber: '1204',
        residenceName: 'Solea Mactan',
        maxGuests: 4,
        settings: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };
}

function propertyAccessPayload(permissions: readonly string[]) {
  return {
    accessKind: 'member' as const,
    permissions: [...permissions],
    memberId: 'member-team-e2e-001',
    propertyId: TEAM_E2E_PROPERTY_ID,
    orgSlug: TEAM_E2E_ORG_SLUG,
    orgName: 'Kame Homes PH',
    propertySlug: TEAM_E2E_PROPERTY_SLUG,
    propertyName: 'Solea Mactan',
    planLimited: false,
  };
}

function entitlementsPayload(freePlan = false, assistantEnabled = false) {
  return {
    automatedBookingFlow: !freePlan,
    verifiedBadgeEligible: false,
    recommendedBadgeEligible: false,
    telegramNotifications: true,
    teamManagement: { enabled: true, maxMembers: null },
    searchVisibilityTier: 'none' as const,
    marketingPublishLimitPerGroup: 10,
    aiValidations: false,
    aiMonthlyCreditAllowance: 0,
    marketingStudio: true,
    customPages: true,
    aiDashboardAssistant: assistantEnabled,
    aiReceptionist: false,
    aiMarketingGeneration: true,
    aiChatAutoReply: false,
    fullyManagedByPlatform: false,
    financeReporting: true,
    maintenanceReporting: true,
    metaChatChannel: true,
    quickReplies: true,
    customTemplates: true,
    publicPagesAutosave: true,
    bookingImport: true,
    customRoles: true,
    planId: 'plan-team-e2e-001',
    planCode: 'business',
    planName: 'Business',
    pricingModel: 'monthly',
    status: 'active',
    propertySubscriptionId: 'sub-team-e2e-001',
  };
}

function dashboardStatsPayload() {
  return {
    manilaDate: '2026-08-28',
    attention: [],
    pipeline: [],
    trendWindow: { from: '2026-08-01', to: '2026-08-31', label: 'Aug 2026' },
    upcoming: [],
    finance: {
      monthNet: 0,
      monthStays: 0,
      outstandingBalance: 0,
      pipelineEstimate: 0,
    },
    totals: {
      activeBookings: 0,
      totalBookings: 0,
      periodDays: 31,
      checkInsToday: 0,
      checkOutsToday: 0,
      checkInsInPeriod: 0,
    },
    kpis: {
      netProfit: { value: 0, changePercent: 0 },
      totalBookings: { value: 0, changePercent: 0 },
      checkInsInPeriod: { value: 0, changePercent: 0 },
      occupancyRate: { value: 0, changePoints: 0 },
      avgNightlyRate: { value: 0, changePercent: 0 },
      nightsBooked: { value: 0, periodDays: 31 },
    },
    propertyCount: 1,
    parkingCount: 0,
    trendSeries: [],
    recentBookings: [],
    propertyPerformance: [],
    parkingPerformance: [],
    statusBreakdown: [],
  };
}

/** Flat `AppSettingsDto` — HostVerification / settings-completion call `appSettingsToFormValues`. */
function appSettingsPayload() {
  const fieldDefault = 'default' as const;
  const emptyTelegramCreds = {
    tokenConfigured: false,
    chatIdConfigured: false,
    tokenSource: fieldDefault,
    chatIdSource: fieldDefault,
    secretsEncryptionConfigured: false,
  };
  return {
    emailTo: 'host@example.com',
    emailReplyTo: '',
    parkingOwnerEmails: [] as string[],
    sdRefundCronEmailLeadMinutes: 60,
    sdRefundCronMaxCheckoutAgeDays: 14,
    publicGuestAppOrigin: 'http://127.0.0.1:4173',
    facebookReviewsUrl: '',
    emailLogoUrl: '',
    brandColorStored: '',
    inheritedBrandColor: '#0f766e',
    resolvedBrandColor: '#0f766e',
    facebookPageUrl: '',
    airbnbUrl: '',
    instagramUrl: '',
    tiktokUrl: '',
    defaultParkingRateGuest: 0,
    gcashName: '',
    gcashNumber: '',
    gcashQrImageUrl: '',
    paymentProvider: 'gcash',
    paymentMethods: [] as unknown[],
    gafUnitOwner: '',
    gafTowerAndUnitNumber: '',
    gafGuestsOnsiteContactPerson: '',
    gafOwnerContactNumber: '',
    gafUnitOwnerSignatureUrl: '',
    automationToggles: {
      emailNewBookingRequest: true,
      emailGafRequest: true,
      emailBookingAcknowledgement: true,
      emailPetRequest: true,
      emailParkingBroadcast: true,
      emailReadyForCheckin: true,
      emailSdRefundCheckout: true,
    },
    updatedAt: null,
    fieldSources: {
      emailTo: fieldDefault,
      emailReplyTo: fieldDefault,
      parkingOwnerEmails: fieldDefault,
      sdRefundCronEmailLeadMinutes: fieldDefault,
      sdRefundCronMaxCheckoutAgeDays: fieldDefault,
      publicGuestAppOrigin: fieldDefault,
      facebookReviewsUrl: fieldDefault,
      emailLogoUrl: fieldDefault,
      brandColorStored: fieldDefault,
      facebookPageUrl: fieldDefault,
      airbnbUrl: fieldDefault,
      instagramUrl: fieldDefault,
      tiktokUrl: fieldDefault,
      defaultParkingRateGuest: fieldDefault,
      gcashName: fieldDefault,
      gcashNumber: fieldDefault,
      gcashQrImageUrl: fieldDefault,
      paymentProvider: fieldDefault,
      gafUnitOwner: fieldDefault,
      gafTowerAndUnitNumber: fieldDefault,
      gafGuestsOnsiteContactPerson: fieldDefault,
      gafOwnerContactNumber: fieldDefault,
      gafUnitOwnerSignatureUrl: fieldDefault,
    },
    propertyIntegrations: {
      telegram: {
        marketing: emptyTelegramCreds,
        staff: emptyTelegramCreds,
        admin: emptyTelegramCreds,
        finance: emptyTelegramCreds,
        maintenance: emptyTelegramCreds,
        chat: emptyTelegramCreds,
      },
    },
    platformSecrets: {
      resendApiKeyConfigured: false,
      secretsEncryptionKeyConfigured: false,
      geminiApiKeyConfigured: false,
      groqApiKeyConfigured: false,
    },
    externalReviews: [],
    vouchersEnabled: true,
    voucherPrizes: [],
    voucherRevealStyle: 'reel',
    documentRequirementsOverride: null,
    resolvedDocumentRequirements: [],
    residenceDefaultDocumentRequirements: [],
  };
}

function orgSettingsPayload() {
  const fieldDefault = 'default' as const;
  return {
    facebookPageUrl: '',
    airbnbUrl: '',
    instagramUrl: '',
    tiktokUrl: '',
    emailLogoUrl: '',
    updatedAt: null,
    fieldSources: {
      facebookPageUrl: fieldDefault,
      airbnbUrl: fieldDefault,
      instagramUrl: fieldDefault,
      tiktokUrl: fieldDefault,
      emailLogoUrl: fieldDefault,
    },
  };
}

function assistantOrgSettingsPayload() {
  return {
    organizationId: ORG_ID,
    enabled: true,
    disabledPropertyIds: [] as string[],
    dailyMessageLimit: 50,
    monthlyMessageLimit: 500,
    dailyWriteActionLimit: 20,
    updatedBy: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    platformEnabled: true,
    usage: null,
  };
}

function orgAccessPayload() {
  return {
    accessKind: 'member' as const,
    permissions: ['org:properties:view', 'org:bookings:view'] as string[],
    orgId: ORG_ID,
    orgSlug: TEAM_E2E_ORG_SLUG,
    orgName: 'Kame Homes PH',
  };
}

function teamMemberSessionStoragePayload() {
  return {
    authKey: 'kame:e2e-admin-session',
    supabaseAuthKey: SUPABASE_AUTH_STORAGE_KEY,
    supabaseAuthSession: e2eSupabaseAuthSession(),
    session: {
      accessToken: 'playwright-team-token',
      refreshToken: 'playwright-team-refresh',
      userId: 'user-team-e2e-001',
      email: 'team-member@example.com',
      name: 'Team Member',
    },
    orgSlug: TEAM_E2E_ORG_SLUG,
    propertySlug: TEAM_E2E_PROPERTY_SLUG,
  };
}

/** Apply host team-member auth on an already-loaded page (e.g. after a guest flow in the same spec). */
export async function applyTeamMemberSessionStorage(page: Page) {
  await page.evaluate((payload) => {
    window.localStorage.setItem(payload.authKey, JSON.stringify(payload.session));
    window.localStorage.setItem(
      payload.supabaseAuthKey,
      JSON.stringify(payload.supabaseAuthSession)
    );
    window.localStorage.setItem('kame-last-org-slug', payload.orgSlug);
    window.localStorage.setItem('kame-last-property-slug', payload.propertySlug);
    window.localStorage.setItem('kame-last-tenant-kind', 'property');
  }, teamMemberSessionStoragePayload());
}

export async function installTeamMemberSession(page: Page) {
  await page.addInitScript((payload) => {
    window.localStorage.setItem(payload.authKey, JSON.stringify(payload.session));
    window.localStorage.setItem(
      payload.supabaseAuthKey,
      JSON.stringify(payload.supabaseAuthSession)
    );
    window.localStorage.setItem('kame-last-org-slug', payload.orgSlug);
    window.localStorage.setItem('kame-last-property-slug', payload.propertySlug);
    window.localStorage.setItem('kame-last-tenant-kind', 'property');
  }, teamMemberSessionStoragePayload());
}

export async function installPropertyTeamRbacMocks(
  page: Page,
  template: TeamRbacTemplate,
  opts?: { freePlan?: boolean; assistantEnabled?: boolean }
) {
  const permissions = permissionsForTemplate(template);
  const freePlan = Boolean(opts?.freePlan);
  const assistantEnabled = Boolean(opts?.assistantEnabled);
  await installTeamMemberSession(page);

  await page.route('**/functions/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split('/').pop();

    switch (endpoint) {
      case 'list-organizations':
        await fulfillJson(route, { success: true, data: organizationList() });
        return;
      case 'list-properties':
        await fulfillJson(route, { success: true, data: propertyList() });
        return;
      case 'list-parkings':
        await fulfillJson(route, { success: true, data: { parkings: [] } });
        return;
      case 'property-access':
        await fulfillJson(route, { success: true, data: propertyAccessPayload(permissions) });
        return;
      case 'property-entitlements':
        await fulfillJson(route, {
          success: true,
          data: entitlementsPayload(freePlan, assistantEnabled),
        });
        return;
      case 'dashboard-stats':
        await fulfillJson(route, { success: true, data: dashboardStatsPayload() });
        return;
      case 'app-settings':
        await fulfillJson(route, { success: true, data: appSettingsPayload() });
        return;
      case 'org-settings':
        await fulfillJson(route, { success: true, data: orgSettingsPayload() });
        return;
      case 'org-access':
        await fulfillJson(route, { success: true, data: orgAccessPayload() });
        return;
      case 'org-plan':
        await fulfillJson(route, {
          success: true,
          data: {
            planId: 'plan-team-e2e-001',
            planCode: 'business',
            planName: 'Business',
            status: 'active',
          },
        });
        return;
      case 'list-bookings':
        await fulfillJson(route, { success: true, data: [], total: 0 });
        return;
      case 'notifications-list':
        await fulfillJson(route, {
          success: true,
          data: { notifications: [], nextCursor: null, unreadCount: 0 },
        });
        return;
      case 'notifications-mark-read':
        await fulfillJson(route, { success: true, data: { updated: true } });
        return;
      case 'list-host-announcements':
        await fulfillJson(route, { success: true, data: { announcements: [] } });
        return;
      case 'dashboard-assistant-settings':
        await fulfillJson(route, {
          success: true,
          data: assistantEnabled
            ? assistantOrgSettingsPayload()
            : { enabled: false, disabledPropertyIds: [] },
        });
        return;
      case 'dashboard-assistant-conversations':
        if (route.request().method() === 'GET') {
          await fulfillJson(route, { success: true, data: { conversations: [] } });
          return;
        }
        await fulfillJson(route, { success: true, data: {} });
        return;
      case 'dashboard-assistant-chat':
        if (route.request().method() === 'POST') {
          await fulfillJson(route, {
            success: true,
            data: {
              conversationId: 'conv-e2e-assistant-001',
              blocks: assistantChatBlocks,
            },
          });
          return;
        }
        await fulfillJson(route, { success: true, data: {} });
        return;
      case 'dashboard-assistant-confirm': {
        const body = route.request().postDataJSON() as {
          actionId?: string;
          confirm?: boolean;
        };
        await fulfillJson(route, {
          success: true,
          data: {
            actionId: body.actionId ?? 'action-e2e-001',
            status: body.confirm ? 'executed' : 'denied',
            blocks: assistantChatBlocks.map((block) =>
              block.type === 'action_confirmation' && block.actionId === body.actionId
                ? { ...block, status: body.confirm ? 'executed' : 'denied' }
                : block
            ),
          },
        });
        return;
      }
      case 'get-booking-ai-review':
        await fulfillJson(route, { success: true, data: { review: null } });
        return;
      case 'get-booking-ai-assistant-audit':
        await fulfillJson(route, { success: true, data: { entries: [] } });
        return;
      case 'finance-line-items':
        await fulfillJson(route, { success: true, data: [] });
        return;
      case 'maintenance-items':
        await fulfillJson(route, { success: true, data: [] });
        return;
      case 'marketing-templates':
        await fulfillJson(route, { success: true, data: { templates: [] } });
        return;
      case 'property-team-members':
        await fulfillJson(route, {
          success: true,
          data: { members: [], teamInviteCapacity: { used: 1, max: null } },
        });
        return;
      case 'property-team-custom-roles':
        await fulfillJson(route, { success: true, data: { customRoles: [] } });
        return;
      case 'property-team-invitations':
        await fulfillJson(route, { success: true, data: { invitations: [] } });
        return;
      default:
        await fulfillJson(route, { success: true, data: {} });
    }
  });

  await page.route('**/rest/v1/**', async (route) => {
    await fulfillJson(route, []);
  });
}

export async function openPropertyDashboard(page: Page) {
  // Bookings shell — same sidebar as dashboard, fewer page-specific mocks.
  await page.goto(teamRbacPaths.bookings);
  await expect(adminNav(page)).toBeVisible({ timeout: 20_000 });
  await expect(adminNav(page).getByRole('link', { name: 'Bookings' })).toBeVisible({
    timeout: 20_000,
  });
}

export async function expectOnAllowedPropertySection(page: Page) {
  await expect(page).toHaveURL(
    new RegExp(`/org/${TEAM_E2E_ORG_SLUG}/property/${TEAM_E2E_PROPERTY_SLUG}(/bookings)?(\\?|$)`),
    { timeout: 20_000 }
  );
  await expect(adminNav(page)).toBeVisible({ timeout: 20_000 });
}

export function adminNav(page: Page) {
  // Desktop sidebar list lives in <nav aria-label="Main menu"> (aside label is complementary).
  return page.getByRole('navigation', { name: 'Main menu' });
}

export async function expectNavLinkVisible(page: Page, label: string) {
  await expect(adminNav(page).getByRole('link', { name: label })).toBeVisible();
}

export async function expectNavLinkHidden(page: Page, label: string) {
  await expect(adminNav(page).getByRole('link', { name: label })).toHaveCount(0);
}
