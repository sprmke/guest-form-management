/**
 * Email HTML helpers: escape user-controlled text and replace {{placeholders}}
 * in template files under ./email-templates/*.html
 */

/** Public absolute URL for `<img src>` (same asset as `ui/public/images/logo.png` on the live site). */
export const DEFAULT_EMAIL_LOGO_URL = 'https://kamehomes.space/images/logo.png';

const templateCache = new Map<string, string>();

/** Escape text for HTML body contexts (attributes should use stricter encoding if added). */
export function escapeHtml(s: string | number | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Replace `{{key}}` placeholders. Values are inserted as-is — caller must
 * pass `escapeHtml(...)` for guest-supplied fields, or trusted HTML fragments.
 */
export function replacePlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

const templateDir = new URL('./email-templates/', import.meta.url);

/**
 * Load a template once and cache. `name` is path without `.html`, e.g.
 * `gaf-request` or `fragments/test-warning-azure`.
 */
export async function loadEmailTemplate(name: string): Promise<string> {
  const hit = templateCache.get(name);
  if (hit !== undefined) return hit;
  const text = await Deno.readTextFile(new URL(`./${name}.html`, templateDir));
  templateCache.set(name, text);
  return text;
}
