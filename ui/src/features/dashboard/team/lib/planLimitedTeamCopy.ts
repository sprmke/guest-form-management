/** Banner on org/property team when plan_limited inactive members exist. */
export function planLimitedTeamBannerMessage(count: number): string {
  if (count === 1) {
    return '1 member is paused because your plan seat limit is full. Upgrade or free a seat to turn them back on. Their role is saved.';
  }
  return `${count} members are paused because your plan seat limit is full. Upgrade or free seats to turn them back on. Their roles are saved.`;
}

/** Full-page gate when the signed-in user's own seat is paused by plan limits. */
export function planLimitedAccessDeniedTitle(): string {
  return 'Access paused';
}

export function planLimitedAccessDeniedMessage(scope: 'org' | 'property'): string {
  if (scope === 'property') {
    return 'Contact your organization or property owner to upgrade the plan and restore your access.';
  }
  return 'Contact your organization owner to upgrade the plan and restore your access.';
}
