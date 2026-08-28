/** Seeded org hub template names — server mirror of ui/.../orgTeamTemplates.ts */

export const SEEDED_ORG_TEMPLATE_NAMES = {
  FULL_ACCESS: 'Full Access',
  OPERATIONS: 'Operations',
  READ_ONLY: 'Read Only',
} as const;

export type SeededOrgTemplateName =
  (typeof SEEDED_ORG_TEMPLATE_NAMES)[keyof typeof SEEDED_ORG_TEMPLATE_NAMES];

export const SEEDED_ORG_TEMPLATE_NAME_SET = new Set<string>(
  Object.values(SEEDED_ORG_TEMPLATE_NAMES).map((name) => name.toLowerCase())
);

export function isSeededOrgTemplateName(name: string): boolean {
  return SEEDED_ORG_TEMPLATE_NAME_SET.has(name.trim().toLowerCase());
}
