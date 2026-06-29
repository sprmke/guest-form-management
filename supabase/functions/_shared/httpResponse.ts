import { corsHeaders } from "./cors.ts";

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function jsonSuccess(
  req: Request,
  data: unknown,
  extra?: Record<string, unknown>,
): Response {
  return jsonResponse(req, { success: true, data, ...extra });
}

export function jsonError(req: Request, error: string, status = 400): Response {
  return jsonResponse(req, { success: false, error }, status);
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  return null;
}

export async function errorMessageFromThrown(
  error: unknown,
  unauthorizedFallback = "Unauthorized",
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
  unauthorizedFallback = "Unauthorized",
): Promise<Response> {
  console.error(logPrefix, error);
  const { status, message } = await errorMessageFromThrown(
    error,
    unauthorizedFallback,
  );
  return jsonError(req, message, status);
}

export async function readJsonBody(
  req: Request,
): Promise<Record<string, unknown>> {
  return (await req.json().catch(() => ({}))) as Record<string, unknown>;
}

export function requireHttpMethod(req: Request, method: string): void {
  if (req.method !== method) {
    throw new Error(`Method ${req.method} not allowed`);
  }
}

export function parseAction(body: Record<string, unknown>): string {
  return typeof body.action === "string" ? body.action : "";
}

export function parseDraftText(
  body: Record<string, unknown>,
  maxLength = 8000,
): string | null {
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) return null;
  return text.slice(0, maxLength);
}

export function parseDraftScenario(
  body: Record<string, unknown>,
  defaultScenario = "",
): string {
  return typeof body.scenario === "string" ? body.scenario : defaultScenario;
}
