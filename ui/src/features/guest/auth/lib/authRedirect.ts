/** Safe in-app redirect target (no open redirects). Shared by host + guest auth paths. */
export function safeRedirect(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}
