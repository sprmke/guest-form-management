export const GUEST_ACCOUNT_PROFILE_PATH = '/account/profile';
export const GUEST_ACCOUNT_STAYS_PATH = '/account/stays';
/** Legacy path — redirects to {@link GUEST_ACCOUNT_STAYS_PATH}. */
export const GUEST_ACCOUNT_TRIPS_PATH = '/account/trips';
export const GUEST_ACCOUNT_WISHLIST_PATH = '/account/wishlist';
export const GUEST_ACCOUNT_MESSAGES_PATH = '/account/messages';
export const GUEST_ACCOUNT_SETTINGS_PATH = '/account/settings';
/** Hidden from nav for now — route redirects to profile. */

export function isGuestAccountPath(pathname: string): boolean {
  return pathname === '/account' || pathname.startsWith('/account/');
}
