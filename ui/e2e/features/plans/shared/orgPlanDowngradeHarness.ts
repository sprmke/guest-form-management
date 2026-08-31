/**
 * Mocked org Plans downgrade harness — PlanReviewDialog + apply-org-plan-downgrade.
 */

import { expect, type Page, type Route } from '@playwright/test';

const ORG_ID = 'org-plans-downgrade-e2e';
export const PLANS_E2E_ORG_SLUG = 'kame-homes-ph';
export const PLANS_E2E_PROPERTY_ID = 'property-plans-downgrade-e2e';
export const PLANS_E2E_PROPERTY_SLUG = 'solea-mactan';

const PLAN_FREE = 'plan-free';
const PLAN_STARTER = 'plan-starter';
const PLAN_GROWTH = 'plan-growth';
const PLAN_PRO = 'plan-pro';

const SUPABASE_AUTH_STORAGE_KEY = 'sb-127-auth-token';

export const plansE2ePaths = {
  orgPlans: `/org/${PLANS_E2E_ORG_SLUG}/plans?tab=plans`,
} as const;

export type PlansDowngradeHarnessOptions = {
  accessKind?: 'owner' | 'member';
  subscriptionStatus?: 'active' | 'past_due' | 'suspended';
  subscriptionPlanId?: string;
};

type HarnessState = {
  accessKind: 'owner' | 'member';
  subscriptionStatus: 'active' | 'past_due' | 'suspended';
  subscriptionPlanId: string | null;
  subscriptionId: string | null;
  downgradeCalls: string[];
};

function emptyPlanFeatures() {
  return {
    automatedBookingFlow: false,
    verifiedBadgeEligible: false,
    recommendedBadgeEligible: false,
    telegramNotifications: false,
    teamManagement: { enabled: false, maxMembers: null },
    searchVisibilityTier: 'none' as const,
    marketingPublishLimitPerGroup: 0,
    aiValidations: false,
    aiMonthlyCreditAllowance: 0,
    marketingStudio: false,
    customPages: false,
    propertyShowcase: false,
    aiDashboardAssistant: false,
    aiReceptionist: false,
    aiMarketingGeneration: false,
    aiChatAutoReply: false,
    fullyManagedByPlatform: false,
    financeReporting: false,
    maintenanceReporting: false,
    metaChatChannel: false,
    quickReplies: false,
    customTemplates: false,
    publicPagesAutosave: false,
    bookingImport: false,
    calendarSync: false,
    customRoles: false,
  };
}

function planFixture(input: {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  pricePhp: number;
  isDefault?: boolean;
}) {
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    tagline: null,
    sortOrder: input.sortOrder,
    pricingModel: 'subscription',
    pricePhp: input.pricePhp,
    discountPercent: 0,
    volumeDiscountTiers: [],
    volumeRampFloorPhp: 500,
    volumeRampAtCount: 10,
    features: emptyPlanFeatures(),
    isDefault: Boolean(input.isDefault),
  };
}

const PLANS = [
  planFixture({
    id: PLAN_FREE,
    code: 'free',
    name: 'Free',
    sortOrder: 0,
    pricePhp: 0,
    isDefault: true,
  }),
  planFixture({ id: PLAN_STARTER, code: 'starter', name: 'Starter', sortOrder: 10, pricePhp: 399 }),
  planFixture({ id: PLAN_GROWTH, code: 'growth', name: 'Pro', sortOrder: 20, pricePhp: 799 }),
  planFixture({ id: PLAN_PRO, code: 'pro', name: 'Business', sortOrder: 30, pricePhp: 1439 }),
];

function e2eSupabaseAuthSession() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    access_token: 'playwright-plans-token',
    refresh_token: 'playwright-plans-refresh',
    expires_in: 60 * 60,
    expires_at: nowSeconds + 60 * 60,
    token_type: 'bearer',
    user: {
      id: 'user-plans-downgrade-e2e',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'owner@example.com',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: { full_name: 'Plans Owner' },
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

function organizationList(accessKind: 'owner' | 'member') {
  return {
    organizations: [
      {
        id: ORG_ID,
        name: 'Kame Homes PH',
        slug: PLANS_E2E_ORG_SLUG,
        description: null,
        logoUrl: null,
        settings: {},
        accessKind: accessKind === 'owner' ? 'owner' : 'org_admin',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };
}

function orgAccessPayload(accessKind: 'owner' | 'member') {
  const permissions =
    accessKind === 'owner'
      ? [
          'org.dashboard:view',
          'org.bookings:view',
          'org.properties:view',
          'org.parkings:view',
          'org.team:view',
          'org.settings:view',
          'org.plans:view',
        ]
      : ['org.dashboard:view', 'org.plans:view'];

  return {
    accessKind: accessKind === 'owner' ? ('owner' as const) : ('org_admin' as const),
    permissions,
    memberId: accessKind === 'owner' ? null : 'member-plans-e2e',
    canListAllProperties: accessKind === 'owner',
    orgId: ORG_ID,
    orgSlug: PLANS_E2E_ORG_SLUG,
    orgName: 'Kame Homes PH',
    planLimited: false,
    canManageTeam: accessKind === 'owner',
    canInviteTeam: accessKind === 'owner',
    canCreateProperties: accessKind === 'owner',
    canManageProperties: accessKind === 'owner',
    canCreateParkings: accessKind === 'owner',
    canManageParkings: accessKind === 'owner',
    canEditSettings: accessKind === 'owner',
    canViewPlans: true,
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
    },
  };
}

function orgPlanPayload(state: HarnessState) {
  const currentPlan = PLANS.find((plan) => plan.id === state.subscriptionPlanId) ?? null;
  return {
    plans: PLANS,
    properties: [
      {
        id: PLANS_E2E_PROPERTY_ID,
        name: 'Solea Mactan',
        slug: PLANS_E2E_PROPERTY_SLUG,
        status: 'ACTIVE',
      },
    ],
    subscription: currentPlan
      ? {
          id: state.subscriptionId ?? 'sub-plans-downgrade-e2e',
          planId: currentPlan.id,
          planCode: currentPlan.code,
          planName: currentPlan.name,
          pricingModel: 'subscription',
          status: state.subscriptionStatus,
          pricePhpSnapshot: currentPlan.pricePhp,
          currentPeriodStart: '2026-08-01T00:00:00.000Z',
          currentPeriodEnd: '2026-09-01T00:00:00.000Z',
          gracePeriodEndsAt: null,
        }
      : null,
    assignedPropertyIds: currentPlan ? [PLANS_E2E_PROPERTY_ID] : [],
    pendingCheckoutUrl: null,
    transactions: [],
  };
}

export async function installPlansDowngradeSession(page: Page) {
  await page.addInitScript(
    ({ authKey, session, supabaseAuthKey, supabaseAuthSession, orgSlug }) => {
      window.localStorage.setItem(authKey, JSON.stringify(session));
      window.localStorage.setItem(supabaseAuthKey, JSON.stringify(supabaseAuthSession));
      window.localStorage.setItem('kame-last-org-slug', orgSlug);
      window.localStorage.setItem('kame-last-tenant-kind', 'org');
    },
    {
      authKey: 'kame:e2e-admin-session',
      supabaseAuthKey: SUPABASE_AUTH_STORAGE_KEY,
      supabaseAuthSession: e2eSupabaseAuthSession(),
      session: {
        accessToken: 'playwright-plans-token',
        refreshToken: 'playwright-plans-refresh',
        userId: 'user-plans-downgrade-e2e',
        email: 'owner@example.com',
        name: 'Plans Owner',
      },
      orgSlug: PLANS_E2E_ORG_SLUG,
    }
  );
}

export async function installPlansDowngradeMocks(
  page: Page,
  options: PlansDowngradeHarnessOptions = {}
) {
  const state: HarnessState = {
    accessKind: options.accessKind ?? 'owner',
    subscriptionStatus: options.subscriptionStatus ?? 'active',
    subscriptionPlanId: options.subscriptionPlanId ?? PLAN_GROWTH,
    subscriptionId: 'sub-plans-downgrade-e2e',
    downgradeCalls: [],
  };

  await installPlansDowngradeSession(page);

  await page.route('**/functions/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split('/').pop();

    switch (endpoint) {
      case 'list-organizations':
        await fulfillJson(route, { success: true, data: organizationList(state.accessKind) });
        return;
      case 'list-properties':
        await fulfillJson(route, {
          success: true,
          data: {
            properties: [
              {
                id: PLANS_E2E_PROPERTY_ID,
                organizationId: ORG_ID,
                name: 'Solea Mactan',
                slug: PLANS_E2E_PROPERTY_SLUG,
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
          },
        });
        return;
      case 'list-parkings':
        await fulfillJson(route, { success: true, data: { parkings: [] } });
        return;
      case 'org-access':
        await fulfillJson(route, {
          success: true,
          data: orgAccessPayload(state.accessKind),
        });
        return;
      case 'dashboard-stats':
        await fulfillJson(route, { success: true, data: dashboardStatsPayload() });
        return;
      case 'list-bookings':
        await fulfillJson(route, { success: true, data: [], total: 0 });
        return;
      case 'org-settings':
        await fulfillJson(route, {
          success: true,
          data: {
            facebookPageUrl: '',
            airbnbUrl: '',
            instagramUrl: '',
            tiktokUrl: '',
            emailLogoUrl: '',
            updatedAt: null,
            fieldSources: {},
          },
        });
        return;
      case 'org-plan': {
        await fulfillJson(route, { success: true, data: orgPlanPayload(state) });
        return;
      }
      case 'apply-org-plan-downgrade': {
        const body = route.request().postDataJSON() as { planId?: string };
        const targetPlanId = String(body.planId ?? '');
        state.downgradeCalls.push(targetPlanId);
        if (targetPlanId === PLAN_FREE) {
          state.subscriptionPlanId = null;
          state.subscriptionId = null;
        } else {
          state.subscriptionPlanId = targetPlanId;
        }
        await fulfillJson(route, {
          success: true,
          data: {
            orgSubscriptionId: state.subscriptionId,
            toFree: targetPlanId === PLAN_FREE,
          },
        });
        return;
      }
      case 'property-entitlements':
        await fulfillJson(route, {
          success: true,
          data: {
            ...emptyPlanFeatures(),
            planId: PLAN_GROWTH,
            planCode: 'growth',
            planName: 'Pro',
            pricingModel: 'subscription',
            status: state.subscriptionStatus,
            propertySubscriptionId: state.subscriptionId ?? '',
          },
        });
        return;
      case 'notifications-list':
        await fulfillJson(route, {
          success: true,
          data: { notifications: [], nextCursor: null, unreadCount: 0 },
        });
        return;
      default:
        await fulfillJson(route, { success: true, data: {} });
        return;
    }
  });

  return state;
}

export async function openOrgPlansPage(page: Page) {
  await page.goto(plansE2ePaths.orgPlans);
  await expect(page.getByRole('heading', { name: 'Plans & Billing' }).first()).toBeVisible({
    timeout: 25_000,
  });
  await expect(page.getByRole('tab', { name: 'Plans' })).toBeVisible({ timeout: 15_000 });
}

export async function openDowngradeReview(page: Page, targetPlanName: string) {
  await page
    .getByRole('button', { name: new RegExp(`Downgrade to ${targetPlanName}`, 'i') })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

export { PLAN_FREE, PLAN_GROWTH, PLAN_STARTER };
