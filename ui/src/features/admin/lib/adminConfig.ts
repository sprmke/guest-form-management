// Client-side allow list. This is a UX reject only; the authoritative gate is the
// server-side ADMIN_ALLOWED_EMAILS env read by `_shared/auth.ts#verifyAdminJwt`
// once Phase 3 ships admin edge functions.

const RAW_ALLOWED = (import.meta.env.VITE_ADMIN_ALLOWED_EMAILS as string | undefined) ?? '';

/** Comma-separated → lowercased, trimmed, deduped. */
export const ADMIN_ALLOWED_EMAILS: ReadonlyArray<string> = Array.from(
  new Set(
    RAW_ALLOWED.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  ),
);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (ADMIN_ALLOWED_EMAILS.length === 0) return false;
  return ADMIN_ALLOWED_EMAILS.includes(email.toLowerCase());
}
