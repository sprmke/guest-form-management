/** Keep in sync with `supabase/functions/_shared/telegramFinance.ts#FINANCE_DEFAULT_REMINDER_TEMPLATE`. */
export const FINANCE_DEFAULT_REMINDER_TEMPLATE =
  'Your {{label}} is due on {{due_date}} ({{days_until_due}} day(s) left).\n\nAmount: {{amount}} · {{category}}\n\nPlease pay at your earliest convenience.';

export function financeMessageTemplateForForm(
  stored: string | null | undefined,
  globalDefault = FINANCE_DEFAULT_REMINDER_TEMPLATE,
): string {
  const trimmed = stored?.trim();
  return trimmed || globalDefault;
}

export function financeMessageTemplateForApi(
  formValue: string | undefined,
  enabled: boolean,
  globalDefault = FINANCE_DEFAULT_REMINDER_TEMPLATE,
): string | null {
  if (!enabled) return null;
  const trimmed = formValue?.trim() ?? '';
  if (!trimmed || trimmed === globalDefault) return null;
  return trimmed;
}
