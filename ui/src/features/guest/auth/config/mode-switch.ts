export type AppMode = 'guest' | 'host';

const HOST_DASHBOARD_PREFIXES = [
  '/org/',
  '/onboarding',
  '/accept-',
  '/bookings',
  '/finance',
  '/maintenance',
  '/notifications',
  '/settings',
  '/dashboard',
] as const;

/** True when the user is in the signed-in admin shell (not public marketing). */
export function isHostDashboardPath(pathname: string): boolean {
  return HOST_DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, '') || pathname.startsWith(prefix)
  );
}

export function getAppModeFromPath(pathname: string): AppMode {
  if (pathname.startsWith('/for-hosts') || isHostDashboardPath(pathname)) {
    return 'host';
  }
  return 'guest';
}

const HOST_AUTH_PATHS = [
  '/for-hosts/login',
  '/for-hosts/register',
  '/for-hosts/forgot-password',
  '/for-hosts/reset-password',
  '/for-hosts/verify-email',
] as const;

export function isHostAuthPath(pathname: string): boolean {
  return HOST_AUTH_PATHS.some((path) => pathname === path);
}

/** Target path when switching app mode (auth-aware; guest auth routes are not mounted in GFM). */
export function resolveModeSwitchPath(mode: AppMode, pathname: string): string {
  if (mode === 'host') {
    return '/for-hosts';
  }
  if (isHostAuthPath(pathname)) {
    return '/';
  }
  return '/';
}

export function getModeSwitchHref(mode: AppMode): string {
  return mode === 'host' ? '/for-hosts' : '/';
}
