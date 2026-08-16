import { useEffect, useRef } from 'react';

import { Loader2, Mic, MicOff, PhoneOff } from 'lucide-react';

import {
  ReceptionistAvatar,
  type ReceptionistAvatarState,
} from '@/features/guest/chat/components/voice/ReceptionistAvatar';
import { VoiceBoothRing } from '@/features/guest/chat/components/voice/VoiceBoothRing';
import { VoiceMicWaveform } from '@/features/guest/chat/components/voice/VoiceMicWaveform';
import {
  useVoiceSession,
  type VoiceSessionPhase,
} from '@/features/guest/chat/hooks/useVoiceSession';

import { ChatRichBody } from '@/components/chat/ChatRichBody';
import { cn } from '@/lib/utils';

type Props = {
  propertySlug: string;
  onClose: () => void;
  className?: string;
};

function toAvatarState(phase: VoiceSessionPhase): ReceptionistAvatarState {
  switch (phase) {
    case 'connecting':
      return 'connecting';
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}

function statusLabel(
  phase: VoiceSessionPhase,
  userSpeaking: boolean,
  toolPending: boolean
): string {
  if (userSpeaking && (phase === 'listening' || phase === 'thinking' || phase === 'speaking')) {
    return "You're speaking";
  }
  switch (phase) {
    case 'connecting':
      return 'Connecting…';
    case 'listening':
      return 'Listening';
    case 'thinking':
      return toolPending ? 'Looking that up…' : 'Thinking…';
    case 'speaking':
      return 'Speaking';
    case 'ending':
      return 'Saving conversation…';
    case 'ended':
      return 'Call ended';
    case 'error':
      return 'Connection issue';
    default:
      return '';
  }
}

function formatCountdown(seconds: number | null): string {
  if (seconds === null) return '';
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

function statusToneClass(
  phase: VoiceSessionPhase,
  userSpeaking: boolean,
  isEnding: boolean
): string {
  if (isEnding || phase === 'thinking') return 'text-warning';
  if (userSpeaking || phase === 'listening') return 'text-primary';
  if (phase === 'speaking') return 'text-primary';
  if (phase === 'error') return 'text-destructive';
  return 'text-muted-foreground';
}

const controlButtonClass =
  'flex size-12 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors disabled:opacity-50';

/**
 * In-thread voice receptionist — fills the conversation column (not a modal).
 * Uses theme tokens so light/dark stay aligned with the rest of guest chat.
 */
export function VoiceSessionPanel({ propertySlug, onClose, className }: Props) {
  const session = useVoiceSession(propertySlug);
  const startedRef = useRef(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endingRef = useRef(false);

  const handleClose = () => {
    if (endingRef.current) return;
    endingRef.current = true;
    void session.end('guest_ended');
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    session.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start exactly once on mount
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      handleClose();
    };
    // Capture so a parent Dialog (Contact host) does not dismiss on Escape mid-call.
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- end via endingRef; stable for session lifetime
  }, []);

  useEffect(() => {
    if (session.phase === 'error') return;
    if (session.phase !== 'ended') return;
    closeTimeoutRef.current = setTimeout(onClose, session.errorMessage ? 2200 : 450);
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [session.phase, session.errorMessage, onClose]);

  const live = session.liveCaption?.text.trim() ? session.liveCaption : null;
  const captionLines = (() => {
    if (!live) {
      return session.captions.filter((c) => c.text.trim()).slice(-2);
    }
    const prior = [...session.captions].reverse().find((c) => {
      if (!c.text.trim()) return false;
      if (c.role === live.role && c.text === live.text) return false;
      return c.role !== live.role;
    });
    return [...(prior ? [prior] : []), live];
  })();

  const avatarState = toAvatarState(session.phase);
  const isEnding = session.phase === 'ending';
  const showWave =
    !isEnding &&
    (session.phase === 'listening' ||
      session.phase === 'thinking' ||
      session.userSpeaking ||
      session.phase === 'speaking');

  const controlsDisabled =
    session.phase === 'connecting' ||
    session.phase === 'ending' ||
    session.phase === 'ended' ||
    session.phase === 'error';

  return (
    <section
      className={cn('bg-card flex min-h-0 flex-1 flex-col overflow-hidden', className)}
      aria-label="Voice receptionist"
    >
      <div className="border-border flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-muted-foreground w-11 shrink-0 text-xs font-medium tabular-nums">
          {isEnding ? '' : formatCountdown(session.remainingSeconds)}
        </span>
        <p
          aria-live="polite"
          className={cn(
            'min-w-0 truncate text-center text-[11px] font-semibold uppercase tracking-[0.12em]',
            statusToneClass(session.phase, session.userSpeaking, isEnding)
          )}
        >
          {statusLabel(session.phase, session.userSpeaking, session.toolPending)}
        </p>
        <button
          type="button"
          aria-label="End call"
          onClick={handleClose}
          disabled={isEnding || session.phase === 'ended'}
          className={cn(
            'text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex size-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50'
          )}
        >
          <PhoneOff className="size-5" aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto overscroll-y-contain px-3 py-4">
        <div className="relative size-40 shrink-0">
          <VoiceBoothRing state={avatarState} amplitude={isEnding ? 0 : session.amplitude} />
          <div className="absolute inset-[11px] flex items-center justify-center">
            <ReceptionistAvatar
              state={avatarState}
              amplitude={isEnding ? 0 : session.amplitude}
              size={138}
            />
          </div>
        </div>

        {isEnding ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
            <Loader2 className="text-warning size-4 shrink-0 animate-spin" aria-hidden />
            <span>Saving conversation…</span>
          </div>
        ) : null}

        {showWave ? (
          <VoiceMicWaveform
            amplitude={session.amplitude}
            active={
              session.phase === 'listening' || session.userSpeaking || session.phase === 'speaking'
            }
          />
        ) : null}

        {session.errorMessage ? (
          <p role="alert" className="text-destructive max-w-sm text-center text-sm">
            {session.errorMessage}
          </p>
        ) : null}

        {!isEnding && captionLines.length > 0 ? (
          <div className="flex w-full max-w-md flex-col gap-2">
            {captionLines.map((line, i) => {
              const guest = line.role === 'guest';
              return (
                <div
                  key={`${line.role}-${i}-${line.text.slice(0, 24)}`}
                  className={cn(
                    'w-fit max-w-[min(100%,28rem)] rounded-2xl px-3 py-2 text-left text-sm leading-snug',
                    guest
                      ? 'bg-primary text-primary-foreground self-end'
                      : 'border-border/60 bg-card text-foreground self-start border'
                  )}
                >
                  {guest ? (
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {line.text}
                    </p>
                  ) : (
                    <ChatRichBody text={line.text} compactMaps />
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="border-border bg-card flex shrink-0 items-center justify-center gap-3 border-t px-3 py-2.5 pb-[max(env(safe-area-inset-bottom,0px),0.625rem)]">
        <button
          type="button"
          aria-label={session.muted ? 'Unmute microphone' : 'Mute microphone'}
          aria-pressed={session.muted}
          onClick={session.toggleMute}
          disabled={controlsDisabled}
          className={cn(
            controlButtonClass,
            'border',
            session.muted
              ? 'border-border bg-muted text-foreground'
              : 'border-primary/40 bg-background text-foreground hover:bg-muted/50'
          )}
        >
          {session.muted ? (
            <MicOff className="size-5" aria-hidden />
          ) : (
            <Mic className="size-5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          aria-label="End call"
          onClick={handleClose}
          disabled={isEnding || session.phase === 'ended'}
          className={cn(
            controlButtonClass,
            'bg-destructive text-destructive-foreground hover:bg-destructive/90'
          )}
        >
          {isEnding ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <PhoneOff className="size-5" aria-hidden />
          )}
        </button>
      </div>
    </section>
  );
}
