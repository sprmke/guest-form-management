import { corsHeaders } from './cors.ts';

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function jsonSuccess(
  req: Request,
  data: unknown,
  extra?: Record<string, unknown>
): Response {
  return jsonResponse(req, { success: true, data, ...extra });
}

export function jsonError(req: Request, error: string, status = 400): Response {
  return jsonResponse(req, { success: false, error }, status);
}

/** Plan-tier or AI quota upgrade prompt — matches client `parseEdgeJsonOrQuota` / `upgradeHook` envelope. */
export function jsonUpgradeHook(
  req: Request,
  error: string,
  options?: { feature?: string; status?: number }
): Response {
  return jsonResponse(
    req,
    {
      success: false,
      error,
      upgradeHook: true,
      ...(options?.feature ? { feature: options.feature } : {}),
    },
    options?.status ?? 429
  );
}

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }
  return null;
}

export async function errorMessageFromThrown(
  error: unknown,
  unauthorizedFallback = 'Unauthorized'
): Promise<{ status: number; message: string }> {
  if (error instanceof Response) {
    const status = error.status;
    const message = await error
      .clone()
      .json()
      .then((body: { error?: string }) => body.error ?? unauthorizedFallback)
      .catch(() => unauthorizedFallback);
    return { status, message };
  }
  return { status: 400, message: (error as Error).message };
}

export async function handleEdgeError(
  req: Request,
  error: unknown,
  logPrefix: string,
  unauthorizedFallback = 'Unauthorized'
): Promise<Response> {
  console.error(logPrefix, error);
  const { status, message } = await errorMessageFromThrown(error, unauthorizedFallback);
  return jsonError(req, message, status);
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  return (await req.json().catch(() => ({}))) as Record<string, unknown>;
}

export function requireHttpMethod(req: Request, method: string): void {
  if (req.method !== method) {
    throw new Error(`Method ${req.method} not allowed`);
  }
}

export function parseAction(body: Record<string, unknown>): string {
  return typeof body.action === 'string' ? body.action : '';
}

export function parseDraftText(body: Record<string, unknown>, maxLength = 8000): string | null {
  const text = typeof body.text === 'string' ? body.text : '';
  if (!text.trim()) return null;
  return text.slice(0, maxLength);
}

export function parseDraftScenario(body: Record<string, unknown>, defaultScenario = ''): string {
  return typeof body.scenario === 'string' ? body.scenario : defaultScenario;
}

/** Shared list pagination from URL search params (super-admin + bookings lists). */
export function parsePageLimit(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {}
): { page: number; limit: number } {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 31;
  const maxLimit = defaults.maxLimit ?? 100;
  const page = Math.max(
    1,
    parseInt(searchParams.get('page') ?? String(defaultPage), 10) || defaultPage
  );
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(defaultLimit), 10) || defaultLimit)
  );
  return { page, limit };
}

export function readInvitationId(body: Record<string, unknown>, url?: URL): string {
  if (typeof body.invitationId === 'string' && body.invitationId.trim()) {
    return body.invitationId.trim();
  }
  return url?.searchParams.get('invitationId')?.trim() ?? '';
}

export function jsonErrorFromCatch(
  req: Request,
  error: unknown,
  fallback: string,
  options?: { conflictOnAlready?: boolean }
): Response {
  const message = error instanceof Error ? error.message : fallback;
  const status = options?.conflictOnAlready && message.includes('already') ? 409 : 400;
  return jsonError(req, message, status);
}
