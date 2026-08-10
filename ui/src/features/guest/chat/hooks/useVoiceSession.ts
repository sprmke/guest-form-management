import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { GUEST_MESSAGES_QUERY_KEY } from '@/features/guest/account/lib/guestAccountApi';
import { GUEST_CHAT_MESSAGES_KEY } from '@/features/guest/chat/hooks/useGuestChat';
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

import { isMostlyLatinScript, normalizeChatText } from '@/lib/chat/parseChatRichBlocks';

export type VoiceSessionPhase =
  'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'ending' | 'ended' | 'error';

export type VoiceSessionCaption = { role: VoiceReceptionistRole; text: string };

type ToolFunctionCall = { id?: string; name?: string; args?: Record<string, unknown> };
type ToolCallMessage = { functionCalls?: ToolFunctionCall[] };
type ServerContentMessage = {
  modelTurn?: { parts?: Array<{ inlineData?: { data?: string }; text?: string }> };
  inputTranscription?: { text?: string };
  outputTranscription?: { text?: string };
  turnComplete?: boolean;
  interrupted?: boolean;
  generationComplete?: boolean;
};

const MIC_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;
const AMPLITUDE_GAIN = 3.2;
const AMPLITUDE_SMOOTHING = 0.72;
const CAPTION_HISTORY_LIMIT = 20;
/** No guest or assistant speech activity for this long ends the call (separate from the max-length cap). */
const IDLE_TIMEOUT_MS = 45_000;
const MIC_ACTIVITY_RMS_THRESHOLD = 0.02;
/** Local VAD (UI only) — hysteresis so status flips before Gemini commits end-of-speech. */
const LOCAL_SPEAKING_ON_RMS = 0.022;
const LOCAL_SPEAKING_OFF_RMS = 0.01;
/** After guest mic goes quiet, show Thinking until AI audio / tool call arrives. */
const LOCAL_SILENCE_TO_THINKING_MS = 550;
/** Wait for late outputTranscription chunks after turnComplete before committing assistant text. */
const ASSISTANT_FLUSH_DEBOUNCE_MS = 450;

function normalizeSttText(raw: string): string {
  return normalizeChatText(raw)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Merge Gemini Live transcription chunks (delta or growing cumulative).
 * Prefer cumulative strings from the model; never glue syllable fragments
 * (that produced "breakfastno" / "ilablenext").
 */
function mergeTranscription(prev: string, incoming: string): string | null {
  const chunk = normalizeSttText(incoming);
  if (!chunk.trim()) return prev;

  if (!isMostlyLatinScript(chunk)) {
    if (!prev.trim() || isMostlyLatinScript(prev)) return null;
  }

  if (!prev) return chunk;

  if (chunk.startsWith(prev) || prev.startsWith(chunk)) {
    return chunk.length >= prev.length ? chunk : prev;
  }

  if (prev.includes(chunk)) return prev;
  if (chunk.includes(prev) && chunk.length > prev.length) return chunk;

  const needsSpace = !/\s$/.test(prev) && !/^\s/.test(chunk) && !/^[.,!?;:'")]/.test(chunk);
  return prev + (needsSpace ? ' ' : '') + chunk;
}

function friendlyMicErrorMessage(e: unknown): string {
  const name = e instanceof DOMException ? e.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'Microphone access is blocked. Allow microphone access in your browser settings and try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No microphone was found on this device.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Your microphone is in use by another app. Close it and try again.';
  }
  return 'Could not access your microphone.';
}

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
  const qc = useQueryClient();
  const [phase, setPhase] = useState<VoiceSessionPhase>('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [muted, setMuted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [captions, setCaptions] = useState<VoiceSessionCaption[]>([]);
  const [liveCaption, setLiveCaption] = useState<VoiceSessionCaption | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  /** True while local mic energy looks like guest speech (independent of Gemini VAD). */
  const [userSpeaking, setUserSpeaking] = useState(false);
  /** True while getPropertyFact is in flight (Phase 6.2 / 6.3 status copy). */
  const [toolPending, setToolPending] = useState(false);

  const phaseRef = useRef<VoiceSessionPhase>('idle');
  const mutedRef = useRef(false);
  const endedRef = useRef(false);
  const userSpeakingRef = useRef(false);
  const silenceToThinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Last role that received a Live transcription chunk — used to flush only on role switch. */
  const lastCaptionRoleRef = useRef<VoiceReceptionistRole | null>(null);

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
  const lastActivityMsRef = useRef(Date.now());

  const currentInputBufferRef = useRef('');
  const currentOutputBufferRef = useRef('');
  const transcriptRef = useRef<VoiceReceptionistTranscriptTurn[]>([]);
  const assistantFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const setPhaseIfActive = useCallback((next: VoiceSessionPhase) => {
    setPhase((prev) => (prev === 'ending' || prev === 'ended' || prev === 'error' ? prev : next));
  }, []);

  const clearSilenceToThinkingTimer = useCallback(() => {
    if (silenceToThinkingTimerRef.current !== null) {
      clearTimeout(silenceToThinkingTimerRef.current);
      silenceToThinkingTimerRef.current = null;
    }
  }, []);

  const clearAssistantFlushTimer = useCallback(() => {
    if (assistantFlushTimerRef.current !== null) {
      clearTimeout(assistantFlushTimerRef.current);
      assistantFlushTimerRef.current = null;
    }
  }, []);

  const setUserSpeakingState = useCallback((next: boolean) => {
    if (userSpeakingRef.current === next) return;
    userSpeakingRef.current = next;
    setUserSpeaking(next);
  }, []);

  /**
   * Local RMS → UI speaking / thinking. Does not replace Gemini server VAD for the model;
   * only closes the "stuck on LISTENING" gap after the guest stops talking.
   */
  const applyLocalVad = useCallback(
    (rms: number) => {
      if (mutedRef.current || endedRef.current) return;
      const phase = phaseRef.current;
      if (phase === 'connecting' || phase === 'ending' || phase === 'ended' || phase === 'error') {
        return;
      }

      if (!userSpeakingRef.current && rms >= LOCAL_SPEAKING_ON_RMS) {
        clearSilenceToThinkingTimer();
        setUserSpeakingState(true);
        if (phase === 'thinking' || phase === 'listening') {
          setPhaseIfActive('listening');
        }
        return;
      }

      if (userSpeakingRef.current && rms <= LOCAL_SPEAKING_OFF_RMS) {
        if (silenceToThinkingTimerRef.current !== null) return;
        silenceToThinkingTimerRef.current = setTimeout(() => {
          silenceToThinkingTimerRef.current = null;
          setUserSpeakingState(false);
          if (
            !endedRef.current &&
            pendingPlaybackRef.current === 0 &&
            (phaseRef.current === 'listening' || phaseRef.current === 'thinking')
          ) {
            setPhaseIfActive('thinking');
          }
        }, LOCAL_SILENCE_TO_THINKING_MS);
      } else if (userSpeakingRef.current && rms > LOCAL_SPEAKING_OFF_RMS) {
        clearSilenceToThinkingTimer();
      }
    },
    [clearSilenceToThinkingTimer, setPhaseIfActive, setUserSpeakingState]
  );

  const markActivity = useCallback(() => {
    lastActivityMsRef.current = Date.now();
  }, []);

  /** Commit locally — no mid-call Flash (token + latency). Inbox polish runs once on end. */
  const commitTurn = useCallback((role: VoiceReceptionistRole, rawText: string) => {
    const raw = normalizeSttText(rawText);
    if (!raw || !isMostlyLatinScript(raw)) return;

    if (role === 'assistant') {
      const words = raw.split(/\s+/);
      if (words.length <= 2 && !/[.!?]$/.test(raw)) return;
    }

    const at = new Date().toISOString();
    const last = transcriptRef.current[transcriptRef.current.length - 1];
    let nextText = raw;
    if (last?.role === role) {
      nextText = mergeTranscription(last.text, raw) ?? raw;
      if (nextText === last.text) {
        setLiveCaption({ role, text: nextText });
        return;
      }
      transcriptRef.current = [...transcriptRef.current.slice(0, -1), { role, text: nextText, at }];
    } else {
      transcriptRef.current = [...transcriptRef.current, { role, text: nextText, at }];
    }

    const caption: VoiceSessionCaption = { role, text: nextText };
    setCaptions((prev) => {
      const prevLast = prev[prev.length - 1];
      if (prevLast?.role === role) {
        return [...prev.slice(0, -1), caption].slice(-CAPTION_HISTORY_LIMIT);
      }
      return [...prev, caption].slice(-CAPTION_HISTORY_LIMIT);
    });
    setLiveCaption(caption);
  }, []);

  const flushInputBuffer = useCallback(() => {
    const text = currentInputBufferRef.current.trim();
    currentInputBufferRef.current = '';
    if (text && isMostlyLatinScript(text)) commitTurn('guest', text);
  }, [commitTurn]);

  const flushOutputBuffer = useCallback(() => {
    clearAssistantFlushTimer();
    const text = currentOutputBufferRef.current.trim();
    currentOutputBufferRef.current = '';
    if (text) commitTurn('assistant', text);
  }, [clearAssistantFlushTimer, commitTurn]);

  const scheduleAssistantFlush = useCallback(() => {
    clearAssistantFlushTimer();
    assistantFlushTimerRef.current = setTimeout(() => {
      assistantFlushTimerRef.current = null;
      flushOutputBuffer();
    }, ASSISTANT_FLUSH_DEBOUNCE_MS);
  }, [clearAssistantFlushTimer, flushOutputBuffer]);

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

  const endingPromiseRef = useRef<Promise<void> | null>(null);

  const end = useCallback(
    (reason: VoiceReceptionistEndReason = 'guest_ended', message?: string): Promise<void> => {
      if (endedRef.current) return endingPromiseRef.current ?? Promise.resolve();
      endedRef.current = true;
      setPhase('ending');
      if (message) setErrorMessage(message);

      flushInputBuffer();
      flushOutputBuffer();
      clearAssistantFlushTimer();
      setLiveCaption(null);
      clearSilenceToThinkingTimer();
      setUserSpeakingState(false);

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

      const finish = async () => {
        if (sessionId) {
          try {
            await endVoiceReceptionistSession(sessionId, { endReason: reason, transcript });
            // Transcript is written before this resolves — await refetch so the booth can
            // stay open until the thread actually has the new turns.
            await Promise.all([
              qc.invalidateQueries({ queryKey: [GUEST_CHAT_MESSAGES_KEY] }),
              qc.invalidateQueries({ queryKey: GUEST_MESSAGES_QUERY_KEY }),
            ]);
          } catch (e) {
            console.warn('[useVoiceSession] end call failed:', (e as Error).message);
          }
        }
        setPhase(reason === 'error' ? 'error' : 'ended');
      };

      const promise = finish();
      endingPromiseRef.current = promise;
      return promise;
    },
    [
      qc,
      clearAssistantFlushTimer,
      clearSilenceToThinkingTimer,
      flushInputBuffer,
      flushOutputBuffer,
      setUserSpeakingState,
      stopAmplitudeLoop,
      stopMic,
      stopPlayback,
    ]
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

      if (
        phaseRef.current !== 'connecting' &&
        Date.now() - lastActivityMsRef.current > IDLE_TIMEOUT_MS
      ) {
        end('timeout', 'Ended the call due to inactivity.');
        return;
      }

      let target = 0;
      if (phaseRef.current === 'speaking' && playAnalyserRef.current) {
        if (!playAnalyserBufRef.current) {
          playAnalyserBufRef.current = new Uint8Array(playAnalyserRef.current.fftSize);
        }
        target = readAnalyserRms(playAnalyserRef.current, playAnalyserBufRef.current);
      } else if (
        phaseRef.current === 'listening' ||
        phaseRef.current === 'thinking' ||
        userSpeakingRef.current
      ) {
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

  const playPcm16Base64 = useCallback(
    async (b64: string) => {
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
      clearSilenceToThinkingTimer();
      setUserSpeakingState(false);

      source.onended = () => {
        pendingPlaybackRef.current = Math.max(0, pendingPlaybackRef.current - 1);
        if (pendingPlaybackRef.current === 0) setPhaseIfActive('listening');
      };
      source.start(startAt);
    },
    [clearSilenceToThinkingTimer, setPhaseIfActive, setUserSpeakingState]
  );

  /**
   * Requests mic permission up front — before minting a session/token — so a permission
   * denial never consumes a guest daily-cap slot or leaves an orphaned session row.
   */
  const acquireMicStream = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = stream;
      stream.getTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          if (!endedRef.current) end('error', 'Microphone disconnected.');
        });
      });
      return stream;
    } catch (e) {
      throw new Error(friendlyMicErrorMessage(e));
    }
  }, [end]);

  const attachMicWorklet = useCallback(async () => {
    const stream = micStreamRef.current;
    if (!stream) throw new Error('Microphone not ready.');

    const ctx = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
    micCtxRef.current = ctx;
    await ctx.audioWorklet.addModule('/worklets/voice-pcm-recorder.js');

    const source = ctx.createMediaStreamSource(stream);
    micSourceRef.current = source;
    const worklet = new AudioWorkletNode(ctx, 'voice-pcm-recorder');
    workletNodeRef.current = worklet;

    worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
      const chunk = event.data;
      const rms = computeRms(chunk);
      micRmsRef.current = rms;
      if (rms > MIC_ACTIVITY_RMS_THRESHOLD) markActivity();
      applyLocalVad(rms);
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
  }, [applyLocalVad, markActivity]);

  const handleToolCall = useCallback(
    async (ws: WebSocket, toolCall: ToolCallMessage) => {
      const calls = toolCall.functionCalls ?? [];
      if (!calls.length) return;
      setToolPending(true);
      setPhaseIfActive('thinking');

      try {
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
        // Stay on thinking until AI audio (or the next listening cycle) — don't flash Listening.
      } finally {
        setToolPending(false);
      }
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
          await attachMicWorklet();
          markActivity();
          setPhaseIfActive('listening');
        } catch (e) {
          end('error', (e as Error).message || 'Microphone access failed.');
        }
        return;
      }

      if (msg.toolCall) {
        markActivity();
        void handleToolCall(ws, msg.toolCall as ToolCallMessage);
        return;
      }

      const serverContent = msg.serverContent as ServerContentMessage | undefined;
      if (!serverContent) return;

      if (serverContent.interrupted) {
        markActivity();
        // Drop queued AI audio so barge-in feels immediate.
        nextPlayTimeRef.current = 0;
        pendingPlaybackRef.current = 0;
        stopPlayback();
        // Don't commit a half-spoken AI scrap ("Is there") after barge-in.
        const partialOut = currentOutputBufferRef.current.trim();
        if (partialOut) {
          const words = partialOut.split(/\s+/);
          if (words.length <= 3 && !/[.!?]$/.test(partialOut)) {
            currentOutputBufferRef.current = '';
          } else {
            flushOutputBuffer();
          }
        }
        setPhaseIfActive('listening');
      }

      if (serverContent.inputTranscription?.text) {
        markActivity();
        clearAssistantFlushTimer();
        if (lastCaptionRoleRef.current === 'assistant' && currentOutputBufferRef.current.trim()) {
          flushOutputBuffer();
        }
        lastCaptionRoleRef.current = 'guest';
        const merged = mergeTranscription(
          currentInputBufferRef.current,
          serverContent.inputTranscription.text
        );
        if (merged !== null) {
          currentInputBufferRef.current = merged;
          setLiveCaption({ role: 'guest', text: merged });
        }
        setUserSpeakingState(true);
        clearSilenceToThinkingTimer();
        if (phaseRef.current !== 'speaking' || pendingPlaybackRef.current === 0) {
          setPhaseIfActive('listening');
        }
      }
      if (serverContent.outputTranscription?.text) {
        markActivity();
        // Late STT after turnComplete — cancel pending flush and keep accumulating.
        clearAssistantFlushTimer();
        if (lastCaptionRoleRef.current === 'guest' && currentInputBufferRef.current.trim()) {
          flushInputBuffer();
        }
        lastCaptionRoleRef.current = 'assistant';
        const merged = mergeTranscription(
          currentOutputBufferRef.current,
          serverContent.outputTranscription.text
        );
        if (merged !== null) {
          currentOutputBufferRef.current = merged;
          setLiveCaption({ role: 'assistant', text: merged });
        }
        setUserSpeakingState(false);
        clearSilenceToThinkingTimer();
      }

      const parts = serverContent.modelTurn?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          markActivity();
          void playPcm16Base64(part.inlineData.data);
        }
      }

      if (serverContent.turnComplete || serverContent.generationComplete) {
        flushInputBuffer();
        // Debounce assistant commit so late outputTranscription chunks can land.
        if (currentOutputBufferRef.current.trim()) {
          scheduleAssistantFlush();
        }
        lastCaptionRoleRef.current = null;
        if (pendingPlaybackRef.current === 0) {
          if (phaseRef.current === 'thinking' || phaseRef.current === 'speaking') {
            setPhaseIfActive('listening');
          }
        }
      }
    },
    [
      attachMicWorklet,
      clearAssistantFlushTimer,
      clearSilenceToThinkingTimer,
      end,
      flushInputBuffer,
      flushOutputBuffer,
      handleToolCall,
      markActivity,
      playPcm16Base64,
      scheduleAssistantFlush,
      setPhaseIfActive,
      setUserSpeakingState,
      stopPlayback,
    ]
  );

  const start = useCallback(() => {
    if (
      phaseRef.current !== 'idle' &&
      phaseRef.current !== 'ended' &&
      phaseRef.current !== 'error'
    ) {
      return;
    }

    endedRef.current = false;
    endingPromiseRef.current = null;
    transcriptRef.current = [];
    currentInputBufferRef.current = '';
    currentOutputBufferRef.current = '';
    lastCaptionRoleRef.current = null;
    clearAssistantFlushTimer();
    setCaptions([]);
    setLiveCaption(null);
    setErrorMessage(null);
    setAmplitude(0);
    setUserSpeaking(false);
    userSpeakingRef.current = false;
    clearSilenceToThinkingTimer();
    setToolPending(false);
    setPhase('connecting');

    void (async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          throw new Error('You appear to be offline. Check your connection and try again.');
        }

        // Ask for the mic before minting a session/token, so a permission denial never
        // consumes a guest daily-cap slot or leaves an orphaned session row server-side.
        await acquireMicStream();

        const minted = await startVoiceReceptionistSession(propertySlug);
        sessionIdRef.current = minted.sessionId;
        maxSessionSecondsRef.current = minted.maxSessionSeconds;
        startedAtMsRef.current = Date.now();
        lastActivityMsRef.current = Date.now();
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
              // Mirrors locked ephemeral setup (Phase 6.1). Harmless if the token already locked these.
              realtimeInputConfig: {
                automaticActivityDetection: {
                  disabled: false,
                  startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
                  endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
                  prefixPaddingMs: 40,
                  silenceDurationMs: 900,
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
          })
        );

        ws.onmessage = (event) => void handleSocketMessage(ws, event);
        ws.onerror = () => end('error', 'Voice connection lost. Please try again.');
        ws.onclose = () => {
          if (!endedRef.current)
            end('error', 'Voice connection closed unexpectedly. Please try again.');
        };

        startAmplitudeLoop();
      } catch (e) {
        stopMic();
        setErrorMessage((e as Error).message || 'Could not start the voice receptionist.');
        setPhase('error');
      }
    })();
  }, [
    acquireMicStream,
    clearAssistantFlushTimer,
    clearSilenceToThinkingTimer,
    end,
    handleSocketMessage,
    propertySlug,
    startAmplitudeLoop,
    stopMic,
  ]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      if (next) {
        clearSilenceToThinkingTimer();
        setUserSpeakingState(false);
      }
      return next;
    });
  }, [clearSilenceToThinkingTimer, setUserSpeakingState]);

  useEffect(() => {
    return () => {
      // Only end a real server session on unmount. Calling end() with no sessionId
      // still flips phase → 'ended', which auto-closes the overlay after Strict Mode
      // remount races (and burns UX when opening from a dropdown).
      if (sessionIdRef.current) {
        end('guest_ended');
      } else {
        stopMic();
        try {
          wsRef.current?.close();
        } catch {
          // already closed
        }
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on unmount only
  }, []);

  // Hard browser close/refresh doesn't unmount React — best-effort end call so the session
  // row closes promptly instead of relying solely on the server's stale-session cap aging.
  useEffect(() => {
    const handlePageHide = () => end('guest_ended');
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable listener, end() is a ref-backed callback
  }, []);

  return {
    phase,
    amplitude,
    muted,
    toggleMute,
    remainingSeconds,
    captions,
    liveCaption,
    userSpeaking,
    toolPending,
    errorMessage,
    start,
    end,
  };
}
