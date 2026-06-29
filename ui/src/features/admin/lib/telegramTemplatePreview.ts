import * as React from "react";

const TELEGRAM_TOKEN_PATTERN = /(\{\{[^}]+\}\})/g;
const TELEGRAM_TOKEN_TEST = /^\{\{[^}]+\}\}$/;

const TELEGRAM_PLACEHOLDER_HIGHLIGHT_CLASS_PREVIEW =
  "rounded bg-primary/15 px-0.5 font-mono text-primary";

const TELEGRAM_PLACEHOLDER_HIGHLIGHT_CLASS_EDIT =
  "rounded-sm bg-primary/15 text-primary";

function extractTelegramPlaceholderKey(part: string): string | null {
  if (!TELEGRAM_TOKEN_TEST.test(part)) return null;
  return part.slice(2, -2).trim();
}

function isKnownTelegramPlaceholder(
  part: string,
  validKeys?: ReadonlySet<string>,
): boolean {
  const key = extractTelegramPlaceholderKey(part);
  if (!key) return false;
  if (!validKeys || validKeys.size === 0) return true;
  return validKeys.has(key);
}

export function renderTelegramPlaceholderHighlights(
  text: string,
  keyPrefix = "",
  variant: "edit" | "preview" = "preview",
  validKeys?: ReadonlySet<string>,
): React.ReactNode[] {
  const highlightClass =
    variant === "edit"
      ? TELEGRAM_PLACEHOLDER_HIGHLIGHT_CLASS_EDIT
      : TELEGRAM_PLACEHOLDER_HIGHLIGHT_CLASS_PREVIEW;

  return text.split(TELEGRAM_TOKEN_PATTERN).map((part, index) => {
    const key = `${keyPrefix}${index}`;
    if (isKnownTelegramPlaceholder(part, validKeys)) {
      return React.createElement(
        "mark",
        { key, className: highlightClass },
        part,
      );
    }
    return React.createElement(React.Fragment, { key }, part);
  });
}

export function applyTelegramPlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}
