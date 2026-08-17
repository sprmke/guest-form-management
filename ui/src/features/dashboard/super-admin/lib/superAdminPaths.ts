export const superAdminPaths = {
  root: '/admin',
  developments: '/admin/developments',
  developmentDetail: (slug: string) => `/admin/developments/${slug}`,
  approvals: '/admin/approvals',
  support: '/admin/support',
  supportFaqs: '/admin/support/faqs',
  hosts: '/admin/hosts',
  settings: '/admin/settings',
  properties: '/admin/properties',
  hostDetail: (hostId: string) => `/admin/hosts/${hostId}`,
  hostOrgs: (hostId: string) => `/admin/hosts/${hostId}/orgs`,
  hostProperties: (hostId: string) => `/admin/hosts/${hostId}/orgs/properties`,
  orgProperties: (orgSlug: string) => `/admin/orgs/${orgSlug}/properties`,
} as const;

export function superAdminOrgSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/admin\/orgs\/([^/]+)/);
  return match?.[1] ?? null;
}

export function superAdminDevelopmentSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/admin\/developments\/([^/]+)/);
  return match?.[1] ?? null;
}

export function superAdminHostIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/admin\/hosts\/([^/]+)/);
  return match?.[1] ?? null;
}
