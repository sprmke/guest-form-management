/**
 * Mint Gemini Live API ephemeral tokens (v1alpha).
 * Browser connects directly via BidiGenerateContentConstrained — never expose GEMINI_API_KEY.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/ephemeral-tokens
 */

/** Official ephemeral-token docs model (native audio). Verify at launch. */
export const GEMINI_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

export const GEMINI_LIVE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'] as const;

export type GeminiLiveVoice = (typeof GEMINI_LIVE_VOICES)[number];

function geminiKeys(): string[] {
  const multi = Deno.env.get('GEMINI_API_KEYS')?.trim();
  if (multi) {
    return multi
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
  }
  const single = Deno.env.get('GEMINI_API_KEY')?.trim();
  return single ? [single] : [];
}

export type MintLiveEphemeralOptions = {
  model?: string;
  voiceName?: string;
  systemInstruction?: string;
  /** When set, locks tools into the token (client cannot swap declarations). */
  tools?: Array<{
    functionDeclarations: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
  }>;
  /** Session TTL for sending messages (default 30m). */
  expireMinutes?: number;
  /** Window to start a new session (default 1m). */
  newSessionExpireMinutes?: number;
};

export type MintLiveEphemeralResult = {
  ephemeralToken: string;
  model: string;
  voiceName: string;
  expireTime: string;
  newSessionExpireTime: string;
  /** True when bidiGenerateContentSetup was included (server-locked config). */
  lockedSessionConfig: boolean;
};

/**
 * POST /v1alpha/auth_tokens — raw REST (no SDK; Deno edge).
 * Omitting fieldMask with a non-empty bidiGenerateContentSetup = global lock of those fields.
 */
export async function mintGeminiLiveEphemeralToken(
  options: MintLiveEphemeralOptions = {}
): Promise<MintLiveEphemeralResult> {
  const keys = geminiKeys();
  if (!keys.length) {
    throw new Error('GEMINI_API_KEYS or GEMINI_API_KEY not set');
  }

  const model = options.model ?? GEMINI_LIVE_MODEL;
  const voiceName = options.voiceName ?? 'Kore';
  const now = Date.now();
  const expireTime = new Date(now + (options.expireMinutes ?? 30) * 60_000).toISOString();
  const newSessionExpireTime = new Date(
    now + (options.newSessionExpireMinutes ?? 1) * 60_000
  ).toISOString();

  const systemText =
    options.systemInstruction ??
    'You are a helpful property receptionist. Keep answers short. Use getPropertyFact for factual questions.';

  const tools = options.tools ?? [
    {
      functionDeclarations: [
        {
          name: 'getPropertyFact',
          description:
            'ONLY when Known facts do not already answer the guest. Prefer Known facts for amenities, check-in/out, parking, pets, rates, wifi, location/map, house rules, capacity, payment, and cancellation. Use mainly for a fresh availability check or a missing detail.',
          parameters: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'Fact topic, e.g. amenities, check-in, parking, wifi, availability',
              },
            },
            required: ['topic'],
          },
        },
      ],
    },
  ];

  // Wait a beat after the guest pauses so mid-sentence breaths don't cut them off
  // (480ms + HIGH end sensitivity produced "Um how much is the" scraps). Locked into
  // the ephemeral token so the browser cannot loosen it.
  const realtimeInputConfig = {
    automaticActivityDetection: {
      disabled: false,
      startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
      endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
      prefixPaddingMs: 40,
      silenceDurationMs: 900,
    },
  };

  // REST body shape after SDK conversion (see google-genai _tokens_converters).
  const body: Record<string, unknown> = {
    uses: 1,
    expireTime,
    newSessionExpireTime,
    bidiGenerateContentSetup: {
      model: model.startsWith('models/') ? model : `models/${model}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        // Slightly lower than 0.7 — snappier, less meandering spoken replies (Phase 6.2).
        temperature: 0.55,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
      systemInstruction: { parts: [{ text: systemText }] },
      tools,
      realtimeInputConfig,
      // Prefer English via system instruction — native-audio STT does not accept languageCodes here.
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  };

  let lastError = 'auth_tokens create failed';
  for (const key of keys) {
    const url = `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      name?: string;
      error?: { message?: string };
    };
    if (res.ok && json.name) {
      return {
        ephemeralToken: json.name,
        model,
        voiceName,
        expireTime,
        newSessionExpireTime,
        lockedSessionConfig: true,
      };
    }
    lastError = json.error?.message ?? `HTTP ${res.status}`;
    // Rotate on rate limit / quota
    if (res.status !== 429 && res.status !== 503) break;
  }

  throw new Error(lastError);
}

export function geminiLiveWebSocketUrl(ephemeralToken: string): string {
  const token = encodeURIComponent(ephemeralToken);
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;
}
