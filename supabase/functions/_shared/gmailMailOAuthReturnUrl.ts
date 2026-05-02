/**
 * Validates browser return URL pieces for Gmail OAuth (open redirect hardening).
 */

export function parseAllowedReturnOrigins(): string[] {
  const raw = (Deno.env.get('GMAIL_OAUTH_ALLOWED_RETURN_ORIGINS') ?? '').trim();
  if (!raw) {
    return ['http://127.0.0.1:5173', 'http://localhost:5173'];
  }
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function normalizeReturnOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export function isReturnOriginAllowed(origin: string): boolean {
  const norm = normalizeReturnOrigin(origin);
  return parseAllowedReturnOrigins().includes(norm);
}

/** Safe path segment for post-OAuth redirect (same-origin navigation). */
export function sanitizeReturnPath(input: string | undefined): string {
  const p = (input ?? '/bookings').trim() || '/bookings';
  if (!p.startsWith('/') || p.startsWith('//') || p.includes('\\') || p.includes('\0')) {
    return '/bookings';
  }
  if (p.length > 512) return '/bookings';
  return p;
}

export function buildSuccessRedirect(returnOrigin: string, returnPath: string): string {
  const origin = normalizeReturnOrigin(returnOrigin);
  const path = sanitizeReturnPath(returnPath);
  const sep = path.includes('?') ? '&' : '?';
  return `${origin}${path}${sep}gmail_connected=1`;
}

export function buildErrorRedirect(returnOrigin: string, returnPath: string, code: string): string {
  const origin = normalizeReturnOrigin(returnOrigin);
  const path = sanitizeReturnPath(returnPath);
  const sep = path.includes('?') ? '&' : '?';
  return `${origin}${path}${sep}gmail_error=${encodeURIComponent(code)}`;
}
