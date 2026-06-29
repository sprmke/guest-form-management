import {
  jsonError,
  jsonResponse,
  parseAction,
  parseDraftScenario,
  parseDraftText,
} from "./httpResponse.ts";

export type TelegramDraftRenderResult = {
  renderedText?: string;
  placeholders?: unknown;
  previewGuestName?: string;
  todayBookingCount?: number;
  error?: string;
};

export type TelegramDraftSendResult = {
  sent: boolean;
  error?: string;
  messageCharCount?: number;
  previewGuestName?: string;
  todayBookingCount?: number;
};

export async function telegramSettingsGetResponse<T>(
  req: Request,
  ensureRow: () => Promise<void>,
  loadRow: () => Promise<Record<string, unknown> | null>,
  serialize: (row: Record<string, unknown>) => T,
): Promise<Response> {
  await ensureRow();
  const row = await loadRow();
  if (!row) {
    return jsonError(req, "Settings row missing", 500);
  }
  return jsonResponse(req, { success: true, data: serialize(row) });
}

export function telegramPatchSuccessResponse<T>(
  req: Request,
  data: T,
  cronSync?: Record<string, unknown>,
): Response {
  return jsonResponse(req, {
    success: true,
    data,
    ...(cronSync !== undefined ? { cronSync } : {}),
  });
}

export function telegramPatchNoFields(req: Request): Response {
  return jsonError(req, "No valid fields to update");
}

export function telegramVerifyResponse(
  req: Request,
  verify: unknown,
): Response {
  return jsonResponse(req, { success: true, verify });
}

export function telegramUnknownAction(
  req: Request,
  action: string,
  allowedHint: string,
): Response {
  return jsonError(
    req,
    `Unknown action: ${action || "(missing)"}. ${allowedHint}`,
  );
}

export async function handleTelegramRenderDraftPreview(
  req: Request,
  body: Record<string, unknown>,
  render: (
    text: string,
    scenario: string,
  ) => Promise<TelegramDraftRenderResult>,
  options?: {
    maxLength?: number;
    defaultScenario?: string;
    requireScenario?: boolean;
    allowedScenarios?: string[];
    missingTextError?: string;
    missingScenarioError?: string;
  },
): Promise<Response> {
  const text = parseDraftText(body, options?.maxLength ?? 8000);
  if (!text) {
    return jsonError(req, options?.missingTextError ?? "text is required");
  }

  const scenario = parseDraftScenario(body, options?.defaultScenario ?? "");
  if (options?.requireScenario && options.allowedScenarios) {
    if (!scenario || !options.allowedScenarios.includes(scenario)) {
      return jsonError(
        req,
        options?.missingScenarioError ?? "text and valid scenario are required",
      );
    }
  }

  const rendered = await render(text, scenario);
  if (rendered.error || !rendered.renderedText) {
    return jsonError(req, rendered.error ?? "render_failed");
  }

  const payload: Record<string, unknown> = {
    success: true,
    renderedText: rendered.renderedText,
    placeholders: rendered.placeholders,
  };
  if (rendered.previewGuestName !== undefined) {
    payload.previewGuestName = rendered.previewGuestName;
  }
  if (rendered.todayBookingCount !== undefined) {
    payload.todayBookingCount = rendered.todayBookingCount;
  }
  return jsonResponse(req, payload);
}

export async function handleTelegramSendDraftPreview(
  req: Request,
  body: Record<string, unknown>,
  send: (text: string, scenario: string) => Promise<TelegramDraftSendResult>,
  options?: {
    maxLength?: number;
    defaultScenario?: string;
    requireScenario?: boolean;
    allowedScenarios?: string[];
    missingTextError?: string;
    missingScenarioError?: string;
  },
): Promise<Response> {
  const text = parseDraftText(body, options?.maxLength ?? 8000);
  if (!text) {
    return jsonError(req, options?.missingTextError ?? "text is required");
  }

  const scenario = parseDraftScenario(body, options?.defaultScenario ?? "");
  if (options?.requireScenario && options.allowedScenarios) {
    if (!scenario || !options.allowedScenarios.includes(scenario)) {
      return jsonError(
        req,
        options?.missingScenarioError ?? "text and valid scenario are required",
      );
    }
  }

  const preview = await send(text, scenario);
  const payload: Record<string, unknown> = {
    success: preview.sent,
    sent: preview.sent,
    error: preview.error,
    messageCharCount: preview.messageCharCount,
  };
  if (preview.previewGuestName !== undefined) {
    payload.previewGuestName = preview.previewGuestName;
  }
  if (preview.todayBookingCount !== undefined) {
    payload.todayBookingCount = preview.todayBookingCount;
  }
  return jsonResponse(req, payload, preview.sent ? 200 : 400);
}

export { parseAction };

export function parseMarketingDraftDates(body: Record<string, unknown>): {
  checkInYmd?: string;
  checkOutYmd?: string;
} {
  const ci = typeof body.checkInYmd === "string" ? body.checkInYmd.trim() : "";
  const co =
    typeof body.checkOutYmd === "string" ? body.checkOutYmd.trim() : "";
  return {
    checkInYmd: ci || undefined,
    checkOutYmd: co || undefined,
  };
}

export function templateErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
