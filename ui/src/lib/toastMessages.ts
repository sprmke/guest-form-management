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
  groupLabel = 'Telegram group',
): { ok: boolean; title: string; description?: string } {
  if (verify.credentials.normalizeError) {
    return {
      ok: false,
      title: 'Invalid group setup',
      description: 'Check the Telegram group ID in your server settings.',
    };
  }
  if (!verify.getMe.ok) {
    return {
      ok: false,
      title: 'Bot not reachable',
      description:
        verify.getMe.error ?? 'Check that the Telegram bot token is correct.',
    };
  }
  if (!verify.getChat.ok) {
    return {
      ok: false,
      title: `Cannot access ${groupLabel}`,
      description:
        verify.getChat.error ?? 'Add the bot to the group and try again.',
    };
  }
  const groupName =
    verify.getChat.title ?? verify.getChat.username ?? groupLabel;
  const bot = verify.getMe.username ? `@${verify.getMe.username}` : 'Bot';
  return {
    ok: true,
    title: 'Connection looks good',
    description: `${bot} can post to “${groupName}”.`,
  };
}

export function showTelegramVerifyToast(
  verify: TelegramVerifyDto | undefined,
  groupLabel: string,
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
  fallback = 'Something went wrong. Try again.',
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

export function telegramScheduleSyncError(
  fallback = 'Reminder schedule could not be updated. Your other changes were saved.',
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
    return checkoutOnly === 1
      ? 'Check-out email sent'
      : `${checkoutOnly} check-out emails sent`;
  }
  return null;
}

export function calendarDatesBackfillToast(r: {
  dryRun?: boolean;
  count?: number;
  message?: string;
  summary?: {
    updated: number;
    created: number;
    skipped: number;
    deletedDuplicates: number;
    failed: number;
  };
}): string {
  if (r.message && (r.count === 0 || !r.dryRun)) {
    return r.message;
  }
  if (r.dryRun) {
    if (r.count != null && r.count > 0) {
      return `${r.count} stay(s) would be updated`;
    }
    return 'Preview complete';
  }

  const s = r.summary;
  if (!s) return 'Calendar updated';
  if (s.updated > 0) {
    return s.updated === 1
      ? '1 calendar event updated'
      : `${s.updated} calendar events updated`;
  }
  if (s.failed > 0) return 'Some calendar events could not be updated';
  return 'Calendar updated';
}

export function gmailApprovalBackfillToast(
  r: {
    dryRun?: boolean;
    applied?: number;
    wouldApply?: number;
    failed?: number;
    tasks?: number;
    scannedBookings?: number;
  },
  scopedBooking: boolean,
): string {
  const tasks = r.tasks ?? 0;
  const scanned = r.scannedBookings ?? 0;

  if (r.dryRun) {
    const would = r.wouldApply ?? 0;
    if (would > 0) {
      return scopedBooking
        ? '1 approval would be applied'
        : `${would} approval(s) would be applied`;
    }
    if (tasks === 0) {
      return scopedBooking
        ? 'This booking does not need an approval backfill'
        : 'No bookings need approval backfill';
    }
    return scopedBooking
      ? 'No matching approval email in Gmail for this booking'
      : `No matching approval emails in Gmail (${tasks} booking(s) checked)`;
  }

  const applied = r.applied ?? 0;
  if (applied > 0) {
    return applied === 1 ? '1 approval applied' : `${applied} approvals applied`;
  }
  if ((r.failed ?? 0) > 0) {
    return 'Some approvals could not be applied';
  }
  if (tasks === 0) {
    return scopedBooking
      ? 'This booking does not need an approval backfill'
      : 'No bookings need approval backfill';
  }
  if (scanned > 0 && tasks === 0) {
    return 'No bookings need approval backfill';
  }
  return scopedBooking
    ? 'No matching approval email in Gmail for this booking'
    : `No matching approval emails in Gmail (${tasks} booking(s) checked)`;
}
