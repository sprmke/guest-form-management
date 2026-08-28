/**
 * Property permission catalog metadata for the Phase 2+ tree UI.
 * Hierarchy is UI-only — server stores/checks leaf ids only.
 *
 * Phase 3–6: Bookings through Team/Notifications/Inbox use leaves.
 */

import type { PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';
import { TEAM_PERMISSIONS } from '@/features/dashboard/team/lib/propertyTeamConstants';

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete';

export type PermissionCatalogNode = {
  id: string | null;
  key: string;
  parentKey: string | null;
  module: string;
  label: string;
  description?: string;
  action?: PermissionAction;
  order: number;
  sensitive?: boolean;
  planFeatureKey?: PlanFeatureKey;
};

export type PermissionCatalog = readonly PermissionCatalogNode[];

const MODULE_ORDER = [
  'bookings',
  'finance',
  'pricing',
  'maintenance',
  'marketing',
  'notifications',
  'templates',
  'publicPages',
  'settings',
  'team',
  'inbox',
] as const;

const CATEGORY_TO_MODULE: Record<string, string> = {
  Bookings: 'bookings',
  Finance: 'finance',
  Pricing: 'pricing',
  Maintenance: 'maintenance',
  Marketing: 'marketing',
  Notifications: 'notifications',
  Templates: 'templates',
  'Public Pages': 'publicPages',
  Settings: 'settings',
  Team: 'team',
  Inbox: 'inbox',
};

const MODULE_LABELS: Record<string, string> = {
  bookings: 'Bookings',
  finance: 'Finance',
  pricing: 'Pricing',
  maintenance: 'Maintenance',
  marketing: 'Marketing',
  notifications: 'Notifications',
  templates: 'Templates',
  publicPages: 'Public Pages',
  settings: 'Settings',
  team: 'Team',
  inbox: 'Inbox',
};

const COARSE_PLAN_FEATURES: Partial<Record<string, PlanFeatureKey>> = {
  'bookings.import:add': 'bookingImport',
  'finance.export:view': 'financeReporting',
  'maintenance.export:view': 'maintenanceReporting',
  'notifications.chat:edit': 'telegramNotifications',
  'notifications.marketing:edit': 'telegramNotifications',
  'notifications.staff:edit': 'telegramNotifications',
  'notifications.operations:edit': 'telegramNotifications',
  'notifications.finance:edit': 'telegramNotifications',
  'notifications.maintenance:edit': 'telegramNotifications',
  'inbox.channels:add': 'metaChatChannel',
  'inbox.channels:delete': 'metaChatChannel',
  'inbox.quickReplies:add': 'quickReplies',
  'inbox.quickReplies:edit': 'quickReplies',
  'inbox.automation:edit': 'aiChatAutoReply',
  'team.invitations:add': 'teamManagement',
  'templates.custom:add': 'customTemplates',
  'templates.email:edit': 'customTemplates',
  'marketing:view': 'marketingStudio',
  'marketing.content:add': 'marketingStudio',
  'marketing.content:edit': 'marketingStudio',
  'marketing.templates:add': 'customTemplates',
  'marketing.templates:edit': 'customTemplates',
  'marketing.generate:add': 'aiMarketingGeneration',
  'marketing.publish:add': 'marketingStudio',
  'publicPages.property:edit': 'publicPagesAutosave',
  'publicPages.stayGuide:edit': 'publicPagesAutosave',
  'publicPages.showcase:edit': 'propertyShowcase',
  'settings.voiceReceptionist:edit': 'aiReceptionist',
  'settings.aiOverrides:edit': 'aiMonthlyCreditAllowance',
};

const SENSITIVE_PERMISSION_IDS = new Set([
  'team.members:edit',
  'team.members:delete',
  'team.customRoles:add',
  'team.customRoles:edit',
  'team.customRoles:delete',
]);

function actionFromPermissionId(id: string): PermissionAction {
  const action = id.includes(':') ? id.split(':').pop()! : 'edit';
  if (action === 'view') return 'view';
  if (action === 'add') return 'add';
  if (action === 'delete') return 'delete';
  if (action === 'invite') return 'add';
  return 'edit';
}

function toSentenceCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function chipLabelFromPermission(name: string, id: string): string {
  if (id === 'bookings:view') return 'Open page';
  if (id === 'bookings.create:add') return 'Create';
  if (id === 'bookings.import:add') return 'Import';
  if (id === 'bookings.detail.stay:edit') return 'Stay';
  if (id === 'bookings.detail.guests:edit') return 'Guests';
  if (id === 'bookings.detail.parking:edit') return 'Parking';
  if (id === 'bookings.detail.pets:edit') return 'Pets';
  if (id === 'bookings.detail.pricing:edit') return 'Pricing';
  if (id === 'bookings.detail.workflow:edit') return 'Workflow';
  if (id === 'finance:view') return 'Open page';
  if (id === 'finance.transactions:add') return 'Add';
  if (id === 'finance.transactions:edit') return 'Edit';
  if (id === 'finance.transactions:delete') return 'Delete';
  if (id === 'finance.export:view') return 'Export';
  if (id === 'maintenance:view') return 'Open page';
  if (id === 'maintenance.reminders:add') return 'Add';
  if (id === 'maintenance.reminders:edit') return 'Edit';
  if (id === 'maintenance.reminders:delete') return 'Delete';
  if (id === 'maintenance.export:view') return 'Export';
  if (id === 'marketing:view') return 'Open page';
  if (id === 'marketing.content:add') return 'Add';
  if (id === 'marketing.content:edit') return 'Edit';
  if (id === 'marketing.templates:add') return 'Add';
  if (id === 'marketing.templates:edit') return 'Edit';
  if (id === 'marketing.templates:delete') return 'Delete';
  if (id === 'marketing.generate:add') return 'Generate';
  if (id === 'marketing.publish:add') return 'Publish';
  if (id === 'pricing:view') return 'Open page';
  if (id === 'pricing.rates:edit') return 'Rates';
  if (id === 'pricing.blocks:add') return 'Block';
  if (id === 'pricing.blocks:delete') return 'Unblock';
  if (id === 'templates:view') return 'Open page';
  if (id === 'templates.standard:edit') return 'Standard';
  if (id === 'templates.email:edit') return 'Email';
  if (id === 'templates.custom:add') return 'Add';
  if (id === 'templates.custom:edit') return 'Edit';
  if (id === 'templates.custom:delete') return 'Delete';
  if (id === 'publicPages:view') return 'Open page';
  if (id === 'publicPages.property:edit') return 'Property page';
  if (id === 'publicPages.stayGuide:edit') return 'Stay guide';
  if (id === 'publicPages.showcase:edit') return 'Showcase';
  if (id === 'settings:view') return 'Open page';
  if (id === 'settings.integrations:view') return 'Integrations';
  if (id.startsWith('settings.') && id.endsWith(':edit')) {
    return toSentenceCase(name.replace(/^Edit\s+/i, ''));
  }
  if (id === 'notifications:view') return 'Open page';
  if (id === 'notifications.chat:edit') return 'Chat';
  if (id === 'notifications.marketing:edit') return 'Marketing';
  if (id === 'notifications.staff:edit') return 'Staff';
  if (id === 'notifications.operations:edit') return 'Operations';
  if (id === 'notifications.finance:edit') return 'Finance';
  if (id === 'notifications.maintenance:edit') return 'Maintenance';
  if (id === 'team:view') return 'Open page';
  if (id === 'team.invitations:add') return 'Invite';
  if (id === 'team.invitations:edit') return 'Resend';
  if (id === 'team.invitations:delete') return 'Cancel';
  if (id === 'team.members:edit') return 'Edit';
  if (id === 'team.members:delete') return 'Remove';
  if (id === 'team.customRoles:add') return 'Add';
  if (id === 'team.customRoles:edit') return 'Edit';
  if (id === 'team.customRoles:delete') return 'Delete';
  if (id === 'inbox:view') return 'Open page';
  if (id === 'inbox.messages:edit') return 'Reply';
  if (id === 'inbox.channels:add') return 'Connect';
  if (id === 'inbox.channels:delete') return 'Disconnect';
  if (id === 'inbox.quickReplies:add') return 'Add';
  if (id === 'inbox.quickReplies:edit') return 'Edit';
  if (id === 'inbox.quickReplies:delete') return 'Delete';
  if (id === 'inbox.automation:edit') return 'Automation';
  const suffix = id.split(':')[1] ?? '';
  if (suffix === 'view') return 'Open page';
  if (suffix === 'edit') return 'Edit';
  if (suffix === 'invite') return 'Invite';
  if (suffix === 'manage') return 'Manage';
  if (suffix === 'reply') return 'Reply';
  return toSentenceCase(name.replace(/^(View|Edit|Run|Manage|Invite|Reply)\s+/i, '') || name);
}

function buildCatalog(): PermissionCatalogNode[] {
  const nodes: PermissionCatalogNode[] = [];

  MODULE_ORDER.forEach((module, moduleIndex) => {
    nodes.push({
      id: null,
      key: module,
      parentKey: null,
      module,
      label: MODULE_LABELS[module] ?? module,
      order: moduleIndex,
    });
  });

  nodes.push(
    {
      id: null,
      key: 'settings.sections',
      parentKey: 'settings',
      module: 'settings',
      label: 'Edit',
      order: 0,
    },
    {
      id: null,
      key: 'notifications.modules',
      parentKey: 'notifications',
      module: 'notifications',
      label: 'Edit',
      order: 0,
    },
    {
      id: null,
      key: 'bookings.list',
      parentKey: 'bookings',
      module: 'bookings',
      label: 'Actions',
      order: 0,
    },
    {
      id: null,
      key: 'bookings.detail',
      parentKey: 'bookings',
      module: 'bookings',
      label: 'Detail',
      order: 1,
    },
    {
      id: null,
      key: 'finance.transactions',
      parentKey: 'finance',
      module: 'finance',
      label: 'Transactions',
      order: 0,
    },
    {
      id: null,
      key: 'maintenance.reminders',
      parentKey: 'maintenance',
      module: 'maintenance',
      label: 'Reminders',
      order: 0,
    },
    {
      id: null,
      key: 'marketing.content',
      parentKey: 'marketing',
      module: 'marketing',
      label: 'Content',
      order: 0,
    },
    {
      id: null,
      key: 'marketing.templates',
      parentKey: 'marketing',
      module: 'marketing',
      label: 'Templates',
      order: 1,
    },
    {
      id: null,
      key: 'marketing.generate',
      parentKey: 'marketing',
      module: 'marketing',
      label: 'Generate',
      order: 2,
    },
    {
      id: null,
      key: 'marketing.publish',
      parentKey: 'marketing',
      module: 'marketing',
      label: 'Publish',
      order: 3,
    },
    {
      id: null,
      key: 'pricing.calendar',
      parentKey: 'pricing',
      module: 'pricing',
      label: 'Calendar',
      order: 0,
    },
    {
      id: null,
      key: 'templates.standard',
      parentKey: 'templates',
      module: 'templates',
      label: 'Standard',
      order: 0,
    },
    {
      id: null,
      key: 'templates.email',
      parentKey: 'templates',
      module: 'templates',
      label: 'Email',
      order: 1,
    },
    {
      id: null,
      key: 'templates.custom',
      parentKey: 'templates',
      module: 'templates',
      label: 'Custom',
      order: 2,
    },
    {
      id: null,
      key: 'team.invitations',
      parentKey: 'team',
      module: 'team',
      label: 'Invitations',
      order: 0,
    },
    {
      id: null,
      key: 'team.members',
      parentKey: 'team',
      module: 'team',
      label: 'Members',
      order: 1,
    },
    {
      id: null,
      key: 'team.customRoles',
      parentKey: 'team',
      module: 'team',
      label: 'Custom roles',
      order: 2,
    },
    {
      id: null,
      key: 'inbox.messages',
      parentKey: 'inbox',
      module: 'inbox',
      label: 'Messages',
      order: 0,
    },
    {
      id: null,
      key: 'inbox.channels',
      parentKey: 'inbox',
      module: 'inbox',
      label: 'Channels',
      order: 1,
    },
    {
      id: null,
      key: 'inbox.quickReplies',
      parentKey: 'inbox',
      module: 'inbox',
      label: 'Quick replies',
      order: 2,
    },
    {
      id: null,
      key: 'inbox.automation',
      parentKey: 'inbox',
      module: 'inbox',
      label: 'Automation',
      order: 3,
    }
  );

  const sectionParent: Record<string, string> = {
    'bookings:view': 'bookings',
    'bookings.create:add': 'bookings.list',
    'bookings.import:add': 'bookings.list',
    'bookings.detail.stay:edit': 'bookings.detail',
    'bookings.detail.guests:edit': 'bookings.detail',
    'bookings.detail.parking:edit': 'bookings.detail',
    'bookings.detail.pets:edit': 'bookings.detail',
    'bookings.detail.pricing:edit': 'bookings.detail',
    'bookings.detail.workflow:edit': 'bookings.detail',
    'finance:view': 'finance',
    'finance.transactions:add': 'finance.transactions',
    'finance.transactions:edit': 'finance.transactions',
    'finance.transactions:delete': 'finance.transactions',
    'finance.export:view': 'finance',
    'maintenance:view': 'maintenance',
    'maintenance.reminders:add': 'maintenance.reminders',
    'maintenance.reminders:edit': 'maintenance.reminders',
    'maintenance.reminders:delete': 'maintenance.reminders',
    'maintenance.export:view': 'maintenance',
    'marketing:view': 'marketing',
    'marketing.content:add': 'marketing.content',
    'marketing.content:edit': 'marketing.content',
    'marketing.templates:add': 'marketing.templates',
    'marketing.templates:edit': 'marketing.templates',
    'marketing.templates:delete': 'marketing.templates',
    'marketing.generate:add': 'marketing.generate',
    'marketing.publish:add': 'marketing.publish',
    'pricing:view': 'pricing',
    'pricing.rates:edit': 'pricing.calendar',
    'pricing.blocks:add': 'pricing.calendar',
    'pricing.blocks:delete': 'pricing.calendar',
    'templates:view': 'templates',
    'templates.standard:edit': 'templates.standard',
    'templates.email:edit': 'templates.email',
    'templates.custom:add': 'templates.custom',
    'templates.custom:edit': 'templates.custom',
    'templates.custom:delete': 'templates.custom',
    'publicPages:view': 'publicPages',
    'publicPages.property:edit': 'publicPages',
    'publicPages.stayGuide:edit': 'publicPages',
    'publicPages.showcase:edit': 'publicPages',
    'settings:view': 'settings',
    'settings.integrations:view': 'settings.sections',
    'settings.basicInfo:edit': 'settings.sections',
    'settings.media:edit': 'settings.sections',
    'settings.propertyDetails:edit': 'settings.sections',
    'settings.amenities:edit': 'settings.sections',
    'settings.houseRules:edit': 'settings.sections',
    'settings.guestForm:edit': 'settings.sections',
    'settings.cancellationPolicy:edit': 'settings.sections',
    'settings.location:edit': 'settings.sections',
    'settings.socials:edit': 'settings.sections',
    'settings.payment:edit': 'settings.sections',
    'settings.buildingForms:edit': 'settings.sections',
    'settings.emailAutomations:edit': 'settings.sections',
    'settings.voiceReceptionist:edit': 'settings.sections',
    'settings.aiOverrides:edit': 'settings.sections',
    'settings.dangerZone:edit': 'settings.sections',
    'notifications:view': 'notifications',
    'notifications.chat:edit': 'notifications.modules',
    'notifications.marketing:edit': 'notifications.modules',
    'notifications.staff:edit': 'notifications.modules',
    'notifications.operations:edit': 'notifications.modules',
    'notifications.finance:edit': 'notifications.modules',
    'notifications.maintenance:edit': 'notifications.modules',
    'team:view': 'team',
    'team.invitations:add': 'team.invitations',
    'team.invitations:edit': 'team.invitations',
    'team.invitations:delete': 'team.invitations',
    'team.members:edit': 'team.members',
    'team.members:delete': 'team.members',
    'team.customRoles:add': 'team.customRoles',
    'team.customRoles:edit': 'team.customRoles',
    'team.customRoles:delete': 'team.customRoles',
    'inbox:view': 'inbox',
    'inbox.messages:edit': 'inbox.messages',
    'inbox.channels:add': 'inbox.channels',
    'inbox.channels:delete': 'inbox.channels',
    'inbox.quickReplies:add': 'inbox.quickReplies',
    'inbox.quickReplies:edit': 'inbox.quickReplies',
    'inbox.quickReplies:delete': 'inbox.quickReplies',
    'inbox.automation:edit': 'inbox.automation',
  };

  const byModule = new Map<string, typeof TEAM_PERMISSIONS>();
  for (const permission of TEAM_PERMISSIONS) {
    const module = CATEGORY_TO_MODULE[permission.category] ?? permission.category.toLowerCase();
    const list = byModule.get(module) ?? [];
    list.push(permission);
    byModule.set(module, list);
  }

  for (const [module, permissions] of byModule) {
    permissions.forEach((permission, index) => {
      const parentKey = sectionParent[permission.id] ?? module;
      const leafKey = permission.id.replace(/:/g, '.');
      const isOpenPage = permission.id === `${module}:view`;
      nodes.push({
        id: permission.id,
        key: leafKey,
        parentKey,
        module,
        label: chipLabelFromPermission(permission.name, permission.id),
        description: isOpenPage
          ? 'See this area in the menu'
          : permission.id.endsWith('export:view')
            ? 'Download reports from this area'
            : permission.description,
        action: actionFromPermissionId(permission.id),
        order: index,
        sensitive: SENSITIVE_PERMISSION_IDS.has(permission.id),
        planFeatureKey: COARSE_PLAN_FEATURES[permission.id],
      });
    });
  }

  return nodes;
}

export const PROPERTY_PERMISSION_CATALOG: PermissionCatalog = buildCatalog();

export function getCatalogPageNodes(
  catalog: PermissionCatalog = PROPERTY_PERMISSION_CATALOG
): PermissionCatalogNode[] {
  return catalog
    .filter((node) => node.parentKey === null)
    .slice()
    .sort((a, b) => a.order - b.order);
}

export function getCatalogChildren(
  parentKey: string,
  catalog: PermissionCatalog = PROPERTY_PERMISSION_CATALOG
): PermissionCatalogNode[] {
  return catalog
    .filter((node) => node.parentKey === parentKey)
    .slice()
    .sort((a, b) => a.order - b.order);
}

export function getCatalogLeafIds(
  catalog: PermissionCatalog = PROPERTY_PERMISSION_CATALOG
): string[] {
  return catalog.filter((node) => node.id != null).map((node) => node.id as string);
}

export function getDescendantLeafIds(
  parentKey: string,
  catalog: PermissionCatalog = PROPERTY_PERMISSION_CATALOG
): string[] {
  const children = getCatalogChildren(parentKey, catalog);
  const ids: string[] = [];
  for (const child of children) {
    if (child.id) {
      ids.push(child.id);
    } else {
      ids.push(...getDescendantLeafIds(child.key, catalog));
    }
  }
  return ids;
}
