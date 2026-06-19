/** Thrown when Gmail OAuth refresh fails (invalid_grant / revoked token). */
export class GmailNeedsReconnectError extends Error {
  readonly needsReAuth = true;

  constructor(message?: string) {
    super(
      message ??
        'Gmail OAuth expired — reconnect Gmail in Admin → Settings.',
    );
    this.name = 'GmailNeedsReconnectError';
  }
}

export function messageIndicatesGmailNeedsReconnect(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('invalid_grant') ||
    m.includes('reconnect gmail') ||
    m.includes('gmail oauth expired') ||
    m.includes('re-auth') ||
    m.includes('re-run `npm run gmail-auth`')
  );
}

export function isGmailNeedsReconnectError(err: unknown): err is GmailNeedsReconnectError {
  if (err instanceof GmailNeedsReconnectError) return true;
  if (typeof err === 'object' && err !== null) {
    const o = err as { needsReAuth?: boolean; message?: string };
    if (o.needsReAuth === true) return true;
    if (typeof o.message === 'string' && messageIndicatesGmailNeedsReconnect(o.message)) {
      return true;
    }
  }
  if (err instanceof Error && messageIndicatesGmailNeedsReconnect(err.message)) {
    return true;
  }
  return false;
}

export function toGmailNeedsReconnectError(err: unknown): GmailNeedsReconnectError | null {
  if (err instanceof GmailNeedsReconnectError) return err;
  if (isGmailNeedsReconnectError(err)) {
    const message =
      err instanceof Error
        ? err.message
        : typeof (err as { message?: string }).message === 'string'
          ? (err as { message: string }).message
          : undefined;
    return new GmailNeedsReconnectError(message);
  }
  return null;
}
