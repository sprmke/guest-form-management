import { toast } from 'sonner';

/** Shared Telegram bot + group verify shape (marketing, staff, admin, finance). */
export type TelegramVerifyDto = {
  credentials: {
    chatIdConfigured?: boolean;
    tokenConfigured?: boolean;
    normalizeError?: string;
  };
  getMe: { ok: boolean; username?: string; error?: string };
  getChat: {
    ok: boolean;
    type?: string;
    title?: string;
    username?: string;
    error?: string;
  };
};

function telegramVerifyToastContent(
  verify: TelegramVerifyDto,
  groupLabel = 'Telegram group'
): { ok: boolean; title: string; description?: string } {
  if (verify.credentials.normalizeError) {
    const err = verify.credentials.normalizeError.toLowerCase();
    if (err.includes('token') || err.includes('chat id') || err.includes('incomplete')) {
      return {
        ok: false,
        title: 'Credentials incomplete',
        description: 'Enter valid bot token and chat ID, then try Connect again.',
      };
    }
    return {
      ok: false,
      title: 'Invalid group setup',
      description: verify.credentials.normalizeError,
    };
  }
  if (!verify.getMe.ok) {
    return {
      ok: false,
      title: 'Bot not reachable',
      description:
        verify.getMe.error ?? 'Invalid bot token. Please double-check your token and try again.',
    };
  }
  if (!verify.getChat.ok) {
    return {
      ok: false,
      title: `Cannot access ${groupLabel}`,
      description: verify.getChat.error ?? 'Add the bot to the group and try again.',
    };
  }
  const groupName = verify.getChat.title ?? verify.getChat.username ?? groupLabel;
  const bot = verify.getMe.username ? `@${verify.getMe.username}` : 'Bot';
  return {
    ok: true,
    title: 'Connection looks good',
    description: `${bot} can post to “${groupName}”.`,
  };
}

export function showTelegramVerifyToast(
  verify: TelegramVerifyDto | undefined,
  groupLabel: string
): void {
  if (!verify) {
    toast.error('Could not verify the connection');
    return;
  }
  const msg = telegramVerifyToastContent(verify, groupLabel);
  if (msg.ok) {
    toast.success(msg.title, msg.description ? { description: msg.description } : undefined);
  } else {
    toast.error(msg.title, msg.description ? { description: msg.description } : undefined);
  }
}

/** Map raw errors to short, operator-friendly copy. */
export function friendlyToastError(
  error: unknown,
  fallback = 'Something went wrong. Try again.'
): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message) return fallback;

  const lower = message.toLowerCase();

  if (
    lower.includes('no active session') ||
    lower.includes('please sign in') ||
    lower.includes('jwt')
  ) {
    return 'Please sign in again';
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed')
  ) {
    return 'Network error — check your connection';
  }
  if (
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('not allowed')
  ) {
    return 'You do not have permission to do that';
  }
  if (
    lower.includes('getme') ||
    lower.includes('getchat') ||
    lower.includes('chat_id') ||
    lower.includes('codepoint') ||
    lower.includes('payload') ||
    lower.includes('cron sync')
  ) {
    return fallback;
  }
  if (/^[a-z][a-z0-9_]+$/.test(message)) {
    return fallback;
  }
  if (message.length > 140) {
    return fallback;
  }
  return message;
}

/** Maps `?gmail_error=` codes from `google-mail-oauth-callback` redirects. */
export function gmailOAuthCallbackError(code: string): string {
  switch (code.trim()) {
    case 'save_failed':
      return 'Could not save Google credentials — try Connect Google again';
    case 'token_exchange_failed':
      return 'Google token exchange failed — add the Edge callback redirect URI in Google Cloud (see docs/architecture/validation-and-env.md)';
    case 'invalid_state':
      return 'OAuth session expired or invalid — click Connect Google again';
    case 'missing_refresh_token':
      return 'No refresh token from Google — revoke app access in your Google Account, then reconnect';
    case 'missing_property':
      return 'Property context was lost during OAuth — open Settings for the property and try again';
    case 'access_denied':
      return 'Google sign-in was cancelled';
    default:
      return 'Gmail connection failed';
  }
}

export function telegramScheduleSyncError(
  fallback = 'Reminder schedule could not be updated. Your other changes were saved.'
): string {
  return fallback;
}

export function gmailPollSuccessMessage(result: {
  applied?: number;
  skipped?: number;
  failed?: number;
  reconciled?: number;
  initialized?: boolean;
  historyReset?: boolean;
}): string {
  if (result.initialized) {
    return 'Gmail is ready — run the check again';
  }
  if (result.historyReset) {
    return 'Gmail history was reset. Review recent approvals manually.';
  }

  const applied = result.applied ?? 0;
  const failed = result.failed ?? 0;

  if (applied === 0 && failed === 0) {
    return 'No new approval emails found';
  }
  if (failed > 0) {
    return applied > 0
      ? `${applied} approval(s) applied, ${failed} could not be processed`
      : 'Could not process approval emails';
  }
  return applied === 1 ? '1 approval applied' : `${applied} approvals applied`;
}

export function sdRefundCronSuccessMessage(result: {
  transitioned?: number;
  checkoutEmailsSent?: number;
}): string | null {
  const transitioned = result.transitioned ?? 0;
  const checkoutOnly = result.checkoutEmailsSent ?? 0;

  if (transitioned > 0) {
    return transitioned === 1
      ? '1 booking moved to Ready for check-out'
      : `${transitioned} bookings moved to Ready for check-out`;
  }
  if (checkoutOnly > 0) {
    return checkoutOnly === 1 ? 'Check-out email sent' : `${checkoutOnly} check-out emails sent`;
  }
  return null;
}
