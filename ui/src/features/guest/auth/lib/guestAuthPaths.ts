/** OAuth return URL — lands guest back on the page they started from. */
export function guestOAuthRedirectTo(returnPath: string): string {
  const safe = returnPath.startsWith('/') && !returnPath.startsWith('//') ? returnPath : '/';
  return `${window.location.origin}${safe}`;
}
