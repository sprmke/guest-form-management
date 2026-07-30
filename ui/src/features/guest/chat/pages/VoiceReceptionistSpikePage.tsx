/**
 * Throwaway spike page for Gemini Live ephemeral-token + WebSocket + tool calling.
 * Route: /dev/voice-spike — delete or gate after Phase 1 validation.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useGuestSession } from '@/features/guest/auth/hooks/useGuestSession';
import { supabase } from '@/lib/supabase/client';

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const WS_BASE =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

type SpikeTokenPayload = {
  ephemeralToken: string;
  model: string;
  voiceId: string;
  lockedSessionConfig: boolean;
};

type LogLine = { t: number; text: string };

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function int16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

async function mintSpikeToken(): Promise<SpikeTokenPayload> {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) throw new Error('Sign in required');

  const res = await fetch(`${FUNCTIONS_URL}/voice-receptionist-spike-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
    },
    body: '{}',
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: SpikeTokenPayload;
  };
  if (!json.success || !json.data?.ephemeralToken) {
    throw new Error(json.error ?? 'Token mint failed');
  }
  return json.data;
}

export function VoiceReceptionistSpikePage() {
  const { status } = useGuestSession();
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tokenMeta, setTokenMeta] = useState<Omit<SpikeTokenPayload, 'ephemeralToken'> | null>(
    null
  );

  const wsRef = useRef<WebSocket | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const log = useCallback((text: string) => {
    setLogs((prev) => [...prev.slice(-80), { t: Date.now(), text }]);
  }, []);

  const stopMic = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void micCtxRef.current?.close();
    micCtxRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    stopMic();
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    log('Disconnected');
  }, [log, stopMic]);

  useEffect(() => () => disconnect(), [disconnect]);

  const playPcm16Base64 = useCallback(async (b64: string) => {
    const samples = base64ToInt16(b64);
    const ctx = playCtxRef.current ?? new AudioContext({ sampleRate: 24000 });
    playCtxRef.current = ctx;
    if (ctx.state === 'suspended') await ctx.resume();

    const float = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) float[i] = samples[i]! / 0x8000;

    const buffer = ctx.createBuffer(1, float.length, 24000);
    buffer.copyToChannel(float, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    src.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
  }, []);

  const handleToolCall = useCallback(
    (ws: WebSocket, toolCall: { functionCalls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> }) => {
      const calls = toolCall.functionCalls ?? [];
      const functionResponses = calls.map((fc) => {
        const topic = String(fc.args?.topic ?? 'general');
        log(`Tool: getPropertyFact(${topic})`);
        return {
          id: fc.id,
          name: fc.name ?? 'getPropertyFact',
          response: {
            result: {
              topic,
              fact: `Spike stub: "${topic}" — pool open 8am–8pm, wifi on fridge, check-in 3pm.`,
            },
          },
        };
      });
      ws.send(JSON.stringify({ toolResponse: { functionResponses } }));
    },
    [log]
  );

  const startMic = useCallback(
    async (ws: WebSocket) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      const ctx = new AudioContext({ sampleRate: 16000 });
      micCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but fine for a throwaway spike (no worklet file needed).
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (ev) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = ev.inputBuffer.getChannelData(0);
        const pcm = floatTo16BitPCM(input);
        const data = int16ToBase64(pcm);
        ws.send(
          JSON.stringify({
            realtimeInput: {
              audio: { mimeType: 'audio/pcm;rate=16000', data },
            },
          })
        );
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      log('Mic streaming (PCM16 @ 16kHz)');
    },
    [log]
  );

  const connect = useCallback(async () => {
    if (busy || connected) return;
    setBusy(true);
    try {
      log('Minting ephemeral token…');
      const minted = await mintSpikeToken();
      setTokenMeta({
        model: minted.model,
        voiceId: minted.voiceId,
        lockedSessionConfig: minted.lockedSessionConfig,
      });
      log(
        `Token ok — model=${minted.model} voice=${minted.voiceId} locked=${String(minted.lockedSessionConfig)}`
      );

      const url = `${WS_BASE}?access_token=${encodeURIComponent(minted.ephemeralToken)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('WebSocket open failed'));
      });

      // Client still sends setup; locked fields on the token are the security boundary.
      ws.send(
        JSON.stringify({
          setup: {
            model: `models/${minted.model}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: minted.voiceId } },
              },
            },
            systemInstruction: {
              parts: [{ text: 'Spike client setup (server-locked fields should win).' }],
            },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: 'getPropertyFact',
                    description: 'Fetch a guest-safe property fact by topic.',
                    parameters: {
                      type: 'object',
                      properties: { topic: { type: 'string' } },
                      required: ['topic'],
                    },
                  },
                ],
              },
            ],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        })
      );
      log('Sent setup; waiting for setupComplete…');

      ws.onmessage = async (ev) => {
        let raw = ev.data as string;
        if (ev.data instanceof Blob) raw = await ev.data.text();
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return;
        }

        if (msg.setupComplete) {
          log('setupComplete');
          setConnected(true);
          try {
            await startMic(ws);
          } catch (err) {
            log(`Mic error: ${(err as Error).message}`);
          }
          return;
        }

        if (msg.toolCall) {
          handleToolCall(ws, msg.toolCall as Parameters<typeof handleToolCall>[1]);
          return;
        }

        const serverContent = msg.serverContent as
          | {
              modelTurn?: { parts?: Array<{ inlineData?: { data?: string }; text?: string }> };
              inputTranscription?: { text?: string };
              outputTranscription?: { text?: string };
              turnComplete?: boolean;
            }
          | undefined;

        if (serverContent?.inputTranscription?.text) {
          log(`You: ${serverContent.inputTranscription.text}`);
        }
        if (serverContent?.outputTranscription?.text) {
          log(`AI: ${serverContent.outputTranscription.text}`);
        }

        const parts = serverContent?.modelTurn?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            void playPcm16Base64(part.inlineData.data);
          } else if (part.text) {
            log(`Text: ${part.text}`);
          }
        }

        if (serverContent?.turnComplete) log('— turn complete —');
      };

      ws.onclose = () => {
        setConnected(false);
        stopMic();
        log('WebSocket closed');
      };
    } catch (err) {
      log(`Error: ${(err as Error).message}`);
      disconnect();
    } finally {
      setBusy(false);
    }
  }, [busy, connected, disconnect, handleToolCall, log, playPcm16Base64, startMic, stopMic]);

  if (status === 'loading') {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-lg font-semibold">Voice spike</h1>
        <p className="text-sm text-muted-foreground">Sign in as a guest to mint a Live token.</p>
        <Link className="text-sm underline" to="/for-hosts/login">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col gap-4 p-4 sm:p-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Dev spike
        </p>
        <h1 className="text-lg font-semibold sm:text-xl">Gemini Live voice</h1>
        {tokenMeta ? (
          <p className="text-xs text-muted-foreground">
            {tokenMeta.model} · {tokenMeta.voiceId} · locked=
            {String(tokenMeta.lockedSessionConfig)}
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
          disabled={busy || connected}
          onClick={() => void connect()}
        >
          Connect
        </button>
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-4 text-sm font-medium disabled:opacity-50"
          disabled={!connected && !wsRef.current}
          onClick={disconnect}
        >
          End
        </button>
      </div>

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-xl border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
        {logs.length === 0 ? (
          <li className="text-muted-foreground">Connect, allow mic, ask about amenities.</li>
        ) : (
          logs.map((line) => (
            <li key={line.t + line.text.slice(0, 24)}>{line.text}</li>
          ))
        )}
      </ul>
    </div>
  );
}
