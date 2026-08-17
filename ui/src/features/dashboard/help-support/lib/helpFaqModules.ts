export const FAQ_MODULE_IDS = ['getting-started', 'bookings', 'property', 'parking'] as const;

export const COMMON_FAQ_LIMIT = 8;

export type FaqModuleId = (typeof FAQ_MODULE_IDS)[number];

export type FaqModule = {
  id: FaqModuleId;
  label: string;
  description: string;
  categories: readonly string[];
};

export const FAQ_MODULES: readonly FaqModule[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    description: 'Accounts and team',
    categories: ['Getting Started', 'Team & Permissions'],
  },
  {
    id: 'bookings',
    label: 'Bookings',
    description: 'Stays and calendar',
    categories: ['Bookings'],
  },
  {
    id: 'property',
    label: 'Property',
    description: 'Settings and guests',
    categories: [
      'Property Settings',
      'Notifications',
      'Guest Communication',
      'Billing & Finance',
      'Maintenance & Operations',
      'AI Assistant',
    ],
  },
  {
    id: 'parking',
    label: 'Parking',
    description: 'Slots and rates',
    categories: ['Parking'],
  },
];

const CATEGORY_TO_MODULE = new Map<string, FaqModuleId>();
for (const module of FAQ_MODULES) {
  for (const category of module.categories) {
    CATEGORY_TO_MODULE.set(category, module.id);
  }
}

export function faqModuleForCategory(category: string): FaqModuleId {
  return CATEGORY_TO_MODULE.get(category) ?? 'property';
}

export function faqModuleById(id: FaqModuleId): FaqModule {
  const fallback = FAQ_MODULES[0];
  if (!fallback) throw new Error('FAQ_MODULES is empty');
  return FAQ_MODULES.find((module) => module.id === id) ?? fallback;
}

export function pickCommonFaqs<T extends { sort_order: number; category: string }>(
  faqs: T[],
  limit = COMMON_FAQ_LIMIT
): T[] {
  return [...faqs]
    .sort((a, b) => a.sort_order - b.sort_order || a.category.localeCompare(b.category))
    .slice(0, limit);
}
