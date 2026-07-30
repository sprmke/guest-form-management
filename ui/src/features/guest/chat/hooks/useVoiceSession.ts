import { useCallback, useEffect, useRef, useState } from 'react';

import {
  base64ToInt16,
  computeRms,
  floatTo16BitPCM,
  int16ToBase64,
} from '@/features/guest/chat/lib/voiceAudioCodec';
import {
  callVoiceReceptionistTool,
  endVoiceReceptionistSession,
  geminiLiveWebSocketUrl,
  startVoiceReceptionistSession,
  type VoiceReceptionistEndReason,
  type VoiceReceptionistRole,
  type VoiceReceptionistTranscriptTurn,
} from '@/features/guest/chat/lib/voiceReceptionistApi';

export type VoiceSessionPhase =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'ending'
  | 'ended'
  | 'error';

export type VoiceSessionCaption = { role: VoiceReceptionistRole; text: string };

type ToolFunctionCall = { id?: string; name?: string; args?: Record<string, unknown> };
type ToolCallMessage = { functionCalls?: ToolFunctionCall[] };
type ServerContentMessage = {
  modelTurn?: { parts?: Array<{ inlineData?: { data?: string }; text?: string }> };
  inputTranscription?: { text?: string };
  outputTranscription?: { text?: string };
  turnComplete?: boolean;
};

const MIC_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;
const AMPLITUDE_GAIN = 3.2;
const AMPLITUDE_SMOOTHING = 0.72;
const CAPTION_HISTORY_LIMIT = 20;

function readAnalyserRms(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const v = (buffer[i]! - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buffer.length);
}

export function useVoiceSession(propertySlug: string) {
  const [phase, setPhase] = useState<VoiceSessionPhase>('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [muted, setMuted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [captions, setCaptions] = useState<VoiceSessionCaption[]>([]);
  const [liveCaption, setLiveCaption] = useState<VoiceSessionCaption | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const phaseRef = useRef<VoiceSessionPhase>('idle');
  const mutedRef = useRef(false);
  const endedRef = useRef(false);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const maxSessionSecondsRef = useRef(0);
  const startedAtMsRef = useRef(0);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const micRmsRef = useRef(0);

  const playCtxRef = useRef<AudioContext | null>(null);
  const playAnalyserRef = useRef<AnalyserNode | null>(null);
  const playAnalyserBufRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const nextPlayTimeRef = useRef(0);
  const pendingPlaybackRef = useRef(0);

  const rafIdRef = useRef<number | null>(null);
  const lastRemainingRef = useRef(-1);
  const smoothedAmpRef = useRef(0);
  const lastSetAmpRef = useRef(0);

  const currentInputBufferRef = useRef('');
  const currentOutputBufferRef = useRef('');
  const transcriptRef = useRef<VoiceReceptionistTranscriptTurn[]>([]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const setPhaseIfActive = useCallback((next: VoiceSessionPhase) => {
    setPhase((prev) => (prev === 'ending' || prev === 'ended' || prev === 'error' ? prev : next));
  }, []);

  const appendTranscriptTurn = useCallback((role: VoiceReceptionistRole, text: string) => {
    transcriptRef.current = [...transcriptRef.current, { role, text, at: new Date().toISOString() }];
    setCaptions((prev) => [...prev, { role, text }].slice(-CAPTION_HISTORY_LIMIT));
  }, []);

  const flushInputBuffer = useCallback(() => {
    const text = currentInputBufferRef.current.trim();
    currentInputBufferRef.current = '';
    if (text) appendTranscriptTurn('guest', text);
  }, [appendTranscriptTurn]);

  const flushOutputBuffer = useCallback(() => {
    const text = currentOutputBufferRef.current.trim();
    currentOutputBufferRef.current = '';
    if (text) appendTranscriptTurn('assistant', text);
  }, [appendTranscriptTurn]);

  const stopMic = useCallback(() => {
    workletNodeRef.current?.port.close();
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    if (micCtxRef.current) void micCtxRef.current.close().catch(() => undefined);
    micCtxRef.current = null;
  }, []);

  const stopPlayback = useCallback(() => {
    playAnalyserRef.current?.disconnect();
    playAnalyserRef.current = null;
    playAnalyserBufRef.current = null;
    if (playCtxRef.current) void playCtxRef.current.close().catch(() => undefined);
    playCtxRef.current = null;
    nextPlayTimeRef.current = 0;
    pendingPlaybackRef.current = 0;
  }, []);

  const stopAmplitudeLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const end = useCallback(
    (reason: VoiceReceptionistEndReason = 'guest_ended', message?: string) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setPhase('ending');
      if (message) setErrorMessage(message);

      flushInputBuffer();
      flushOutputBuffer();
      setLiveCaption(null);

      stopAmplitudeLoop();
      stopMic();
      stopPlayback();
      try {
        wsRef.current?.close();
      } catch {
        // already closed
      }
      wsRef.current = null;

      const sessionId = sessionIdRef.current;
      const transcript = transcriptRef.current;
      sessionIdRef.current = null;

      if (sessionId) {
        void endVoiceReceptionistSession(sessionId, { endReason: reason, transcript }).catch((e) => {
          console.warn('[useVoiceSession] end call failed:', (e as Error).message);
        });
      }

      setPhase(reason === 'error' ? 'error' : 'ended');
    },
    [flushInputBuffer, flushOutputBuffer, stopAmplitudeLoop, stopMic, stopPlayback]
  );

  const startAmplitudeLoop = useCallback(() => {
    lastRemainingRef.current = -1;
    smoothedAmpRef.current = 0;
    lastSetAmpRef.current = 0;

    const tick = () => {
      const elapsedSeconds = (Date.now() - startedAtMsRef.current) / 1000;
      const remaining = Math.max(0, Math.ceil(maxSessionSecondsRef.current - elapsedSeconds));
      if (remaining !== lastRemainingRef.current) {
        lastRemainingRef.current = remaining;
        setRemainingSeconds(remaining);
        if (remaining <= 0 && !endedRef.current) {
          end('timeout');
          return;
        }
      }

      let target = 0;
      if (phaseRef.current === 'speaking' && playAnalyserRef.current) {
        if (!playAnalyserBufRef.current) {
          playAnalyserBufRef.current = new Uint8Array(playAnalyserRef.current.fftSize);
        }
        target = readAnalyserRms(playAnalyserRef.current, playAnalyserBufRef.current);
      } else if (phaseRef.current === 'listening') {
        target = micRmsRef.current;
      }

      const smoothed =
        smoothedAmpRef.current * AMPLITUDE_SMOOTHING +
        Math.min(1, target * AMPLITUDE_GAIN) * (1 - AMPLITUDE_SMOOTHING);
      smoothedAmpRef.current = smoothed;
      if (Math.abs(smoothed - lastSetAmpRef.current) > 0.015) {
        lastSetAmpRef.current = smoothed;
        setAmplitude(smoothed);
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
  }, [end]);

  const playPcm16Base64 = useCallback(async (b64: string) => {
    const samples = base64ToInt16(b64);
    const ctx = playCtxRef.current ?? new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
    playCtxRef.current = ctx;
    if (!playAnalyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.connect(ctx.destination);
      playAnalyserRef.current = analyser;
    }
    if (ctx.state === 'suspended') await ctx.resume();

    const float = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) float[i] = samples[i]! / 0x8000;

    const buffer = ctx.createBuffer(1, float.length, PLAYBACK_SAMPLE_RATE);
    buffer.copyToChannel(float, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(playAnalyserRef.current);

    const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    nextPlayTimeRef.current = startAt + buffer.duration;
    pendingPlaybackRef.current += 1;
    setPhaseIfActive('speaking');

    source.onended = () => {
      pendingPlaybackRef.current = Math.max(0, pendingPlaybackRef.current - 1);
      if (pendingPlaybackRef.current === 0) setPhaseIfActive('listening');
    };
    source.start(startAt);
  }, [setPhaseIfActive]);

  const startMic = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    micStreamRef.current = stream;

    const ctx = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
    micCtxRef.current = ctx;
    await ctx.audioWorklet.addModule('/worklets/voice-pcm-recorder.js');

    const source = ctx.createMediaStreamSource(stream);
    micSourceRef.current = source;
    const worklet = new AudioWorkletNode(ctx, 'voice-pcm-recorder');
    workletNodeRef.current = worklet;

    worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
      const chunk = event.data;
      micRmsRef.current = computeRms(chunk);
      if (mutedRef.current) return;
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      const pcm = floatTo16BitPCM(chunk);
      const data = int16ToBase64(pcm);
      wsRef.current.send(
        JSON.stringify({
          realtimeInput: { audio: { mimeType: `audio/pcm;rate=${MIC_SAMPLE_RATE}`, data } },
        })
      );
    };

    // Not connected to destination — we only need it for capture, not local monitoring.
    source.connect(worklet);
  }, []);

  const handleToolCall = useCallback(
    async (ws: WebSocket, toolCall: ToolCallMessage) => {
      const calls = toolCall.functionCalls ?? [];
      if (!calls.length) return;
      setPhaseIfActive('thinking');

      const responses = await Promise.all(
        calls.map(async (fc) => {
          const topic = String(fc.args?.topic ?? '').trim();
          try {
            const result = await callVoiceReceptionistTool(sessionIdRef.current ?? '', topic);
            return {
              id: fc.id,
              name: fc.name ?? 'getPropertyFact',
              response: { result: { topic: result.topic, fact: result.answer } },
            };
          } catch {
            return {
              id: fc.id,
              name: fc.name ?? 'getPropertyFact',
              response: {
                result: {
                  topic,
                  fact: "I don't have that on hand right now — I'll have the host team follow up.",
                },
              },
            };
          }
        })
      );

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
      }
      setPhaseIfActive('listening');
    },
    [setPhaseIfActive]
  );

  const handleSocketMessage = useCallback(
    async (ws: WebSocket, event: MessageEvent) => {
      let raw = event.data as string;
      if (event.data instanceof Blob) raw = await event.data.text();
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return;
      }

      if (msg.setupComplete) {
        try {
          await startMic();
          setPhaseIfActive('listening');
        } catch (e) {
          end('error', (e as Error).message || 'Microphone access failed.');
        }
        return;
      }

      if (msg.toolCall) {
        void handleToolCall(ws, msg.toolCall as ToolCallMessage);
        return;
      }

      const serverContent = msg.serverContent as ServerContentMessage | undefined;
      if (!serverContent) return;

      if (serverContent.inputTranscription?.text) {
        if (currentOutputBufferRef.current) flushOutputBuffer();
        currentInputBufferRef.current += serverContent.inputTranscription.text;
        setLiveCaption({ role: 'guest', text: currentInputBufferRef.current });
      }
      if (serverContent.outputTranscription?.text) {
        if (currentInputBufferRef.current) flushInputBuffer();
        currentOutputBufferRef.current += serverContent.outputTranscription.text;
        setLiveCaption({ role: 'assistant', text: currentOutputBufferRef.current });
      }

      const parts = serverContent.modelTurn?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) void playPcm16Base64(part.inlineData.data);
      }

      if (serverContent.turnComplete) {
        flushOutputBuffer();
        flushInputBuffer();
        setLiveCaption(null);
      }
    },
    [end, flushInputBuffer, flushOutputBuffer, handleToolCall, playPcm16Base64, setPhaseIfActive, startMic]
  );

  const start = useCallback(() => {
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'ended' && phaseRef.current !== 'error') {
      return;
    }

    endedRef.current = false;
    transcriptRef.current = [];
    currentInputBufferRef.current = '';
    currentOutputBufferRef.current = '';
    setCaptions([]);
    setLiveCaption(null);
    setErrorMessage(null);
    setAmplitude(0);
    setPhase('connecting');

    void (async () => {
      try {
        const minted = await startVoiceReceptionistSession(propertySlug);
        sessionIdRef.current = minted.sessionId;
        maxSessionSecondsRef.current = minted.maxSessionSeconds;
        startedAtMsRef.current = Date.now();
        setRemainingSeconds(minted.maxSessionSeconds);

        const ws = new WebSocket(geminiLiveWebSocketUrl(minted.ephemeralToken));
        wsRef.current = ws;

        await new Promise<void>((resolve, reject) => {
          ws.onopen = () => resolve();
          ws.onerror = () => reject(new Error('Could not connect to the voice receptionist.'));
        });

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
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
          })
        );

        ws.onmessage = (event) => void handleSocketMessage(ws, event);
        ws.onerror = () => end('error', 'Voice connection lost.');
        ws.onclose = () => {
          if (!endedRef.current) end('error', 'Voice connection closed unexpectedly.');
        };

        startAmplitudeLoop();
      } catch (e) {
        setErrorMessage((e as Error).message || 'Could not start the voice receptionist.');
        setPhase('error');
      }
    })();
  }, [end, handleSocketMessage, propertySlug, startAmplitudeLoop]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      mutedRef.current = !prev;
      return !prev;
    });
  }, []);

  useEffect(() => {
    return () => {
      end('guest_ended');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on unmount only
  }, []);

  return {
    phase,
    amplitude,
    muted,
    toggleMute,
    remainingSeconds,
    captions,
    liveCaption,
    errorMessage,
    start,
    end,
  };
}
