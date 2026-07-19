/** Client UX gate only — server enforces `SUPER_ADMIN_EMAILS` on edge functions. */
export function parseSuperAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const allowed = parseSuperAdminEmails(import.meta.env.VITE_SUPER_ADMIN_EMAILS);
  return allowed.has(email.trim().toLowerCase());
}
