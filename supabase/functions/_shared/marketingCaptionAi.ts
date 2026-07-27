/**
 * AI-assisted social captions for Marketing Content Studio (Gemini / Groq).
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

function groqKey(): string | null {
  return Deno.env.get('GROQ_API_KEY')?.trim() || null;
}

function extractGeminiText(json: unknown): string | null {
  const parts =
    (
      json as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      }
    ).candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  return text || null;
}

export type MarketingCaptionInput = {
  propertyName: string;
  platform: 'facebook' | 'instagram';
  postType: 'post' | 'story';
  contentHint?: string;
  nightlyRate?: string;
  availabilityText?: string;
};

export async function generateMarketingCaption(input: MarketingCaptionInput): Promise<string> {
  const systemPrompt =
    'You write short, engaging social media captions for vacation rental properties in the Philippines. ' +
    'Use warm Filipino-English when natural. No hashtags unless asked. No markdown. ' +
    'Keep captions under 220 characters for stories, under 400 for feed posts.';

  const formatLabel = input.postType === 'story' ? 'Instagram/Facebook Story' : 'feed post';
  const userPrompt =
    `Property: ${input.propertyName}\n` +
    `Platform: ${input.platform}\n` +
    `Format: ${formatLabel}\n` +
    (input.nightlyRate ? `Rate: ${input.nightlyRate}\n` : '') +
    (input.availabilityText ? `Availability: ${input.availabilityText}\n` : '') +
    (input.contentHint ? `Creative: ${input.contentHint}\n` : '') +
    'Write one caption only — no quotes or labels.';

  const keys = geminiKeys();
  for (const apiKey of keys) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
        }),
      });
      const json = await res.json();
      const text = extractGeminiText(json);
      if (text) return text.slice(0, input.postType === 'story' ? 220 : 400);
    } catch {
      /* try next key */
    }
  }

  const groq = groqKey();
  if (groq) {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groq}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 256,
      }),
    });
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (text) return text.slice(0, input.postType === 'story' ? 220 : 400);
  }

  throw new Error('AI caption unavailable — configure GEMINI_API_KEYS or GROQ_API_KEY');
}
