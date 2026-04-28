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

/**
 * Critical layout/typography mirrored as inline `style` for clients (notably
 * Gmail web) that drop or ignore class rules from `<head>`. Keep visually in
 * sync with `.email-outer` … `.content-pad` / `.h1-title` in the HTML templates.
 */
export const EMAIL_SHELL_STYLE_VARS: Record<string, string> = {
  emailShellBodyStyle:
    'margin:0 !important;padding:0 !important;-webkit-text-size-adjust:100%;background-color:#f3f4f6;',
  emailShellTableOuterStyle:
    'width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#f3f4f6;',
  emailShellTdShellPadStyle: 'padding:32px 16px 44px 16px;',
  emailShellTableWrapperStyle:
    'width:600px;max-width:100%;margin:0 auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;',
  emailShellTdAccentStyle:
    'height:5px;line-height:5px;font-size:0;background-color:#5f954c;border-radius:20px 20px 0 0;',
  emailShellTdCardShellStyle: 'padding:0;vertical-align:top;',
  emailShellTableCardStyle:
    'width:100%;border-collapse:separate;border-spacing:0;background-color:#ffffff;border:2px solid #e2e8f0;border-top:none;border-radius:0 0 20px 20px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.06);',
  emailShellTdContentPadStyle:
    "padding:36px 40px 40px 40px;text-align:left;color:#333333;font-size:15px;line-height:1.65;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
  emailShellTdLegalFooterStyle:
    "padding:22px 16px 0 16px;text-align:center;font-size:12px;line-height:1.55;color:#666666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
  emailShellH1Style:
    "margin:0 0 8px 0;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.02em;color:#333333;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
  emailShellH1LgStyle:
    "margin:0 0 12px 0;font-size:24px;font-weight:700;line-height:1.25;letter-spacing:-0.02em;color:#333333;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
  emailShellDateLineStyle:
    "margin:0 0 24px 0;font-size:14px;line-height:1.5;color:#666666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
  emailShellTaglineLooserStyle:
    "margin:0 0 26px 0;font-size:15px;line-height:1.5;color:#666666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
  emailShellBodyCopyStyle:
    "color:#333333;font-size:16px;line-height:1.65;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
  emailShellBrandMicroStyle:
    "font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#666666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
  emailShellTextSubheadingStyle:
    "font-size:15px;font-weight:700;color:#333333;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
  emailShellTextArrowStyle: 'color:#94a3b8;',
  emailShellCtaBtnStyle:
    "display:inline-block;padding:14px 28px;background-color:#2563eb;color:#ffffff !important;text-decoration:none;border-radius:14px;font-weight:700;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
  emailLogoWrapTdStyle: 'padding:0 0 22px 0;text-align:center;',
  emailLogoImgStyle:
    'display:block;margin:0 auto;width:80px;max-width:80px;height:80px;border:0;outline:none;text-decoration:none;border-radius:50%;',
};

/** Merge Gmail-safe inline style keys after per-email placeholders. */
export function withEmailShellStyleVars(
  vars: Record<string, string>,
): Record<string, string> {
  return { ...vars, ...EMAIL_SHELL_STYLE_VARS };
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
