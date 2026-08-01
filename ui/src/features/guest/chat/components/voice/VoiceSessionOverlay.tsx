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
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Props = {
  propertySlug: string;
  onClose: () => void;
};

/** Phase 6.3 booth palette — night lobby, warm brass accent (not generic purple/cream AI). */
const BOOTH = {
  wash: '#0F1410',
  fill: '#1A221C',
  brass: '#C4A35A',
  green: '#3D9B6A',
  amber: '#D4A017',
  paper: '#F5F2EA',
} as const;

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

const controlButtonClass =
  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors disabled:opacity-50';

export function VoiceSessionOverlay({ propertySlug, onClose }: Props) {
  const session = useVoiceSession(propertySlug);
  const startedRef = useRef(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedAtRef = useRef(Date.now());
  const endingRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    openedAtRef.current = Date.now();
    session.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start exactly once on mount
  }, []);

  useEffect(() => {
    if (session.phase === 'error') return;
    if (session.phase !== 'ended') return;
    closeTimeoutRef.current = setTimeout(onClose, session.errorMessage ? 2200 : 450);
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [session.phase, session.errorMessage, onClose]);

  const handleClose = () => {
    if (endingRef.current) return;
    endingRef.current = true;
    void session.end('guest_ended');
  };

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    if (Date.now() - openedAtRef.current < 400) return;
    handleClose();
  };

  // At most one prior turn + the live turn. Never stack 3+ STT fragments in one plate.
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

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(event) => {
          if (Date.now() - openedAtRef.current < 400 || isEnding) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (Date.now() - openedAtRef.current < 400 || isEnding) {
            event.preventDefault();
          }
        }}
        className={cn(
          'flex h-[min(92dvh,720px)] max-h-[min(94dvh,720px)] w-full max-w-[min(calc(100vw-1.5rem),26rem)]',
          'flex-col gap-0 overflow-hidden rounded-2xl border p-0 sm:max-w-sm',
          'border-[#C4A35A]/25 text-[#F5F2EA] shadow-2xl'
        )}
        style={{ backgroundColor: BOOTH.wash }}
      >
        <DialogTitle className="sr-only">Voice receptionist</DialogTitle>

        <div
          className="flex shrink-0 items-center justify-between border-b px-3 py-2.5"
          style={{ borderColor: 'rgba(196,163,90,0.22)', backgroundColor: BOOTH.fill }}
        >
          <span className="w-11 text-xs font-medium tabular-nums text-[#F5F2EA]/70">
            {isEnding ? '' : formatCountdown(session.remainingSeconds)}
          </span>
          <p
            aria-live="polite"
            className="text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                isEnding || session.phase === 'thinking'
                  ? BOOTH.amber
                  : session.userSpeaking || session.phase === 'listening'
                    ? BOOTH.green
                    : session.phase === 'speaking'
                      ? BOOTH.brass
                      : 'rgba(245,242,234,0.65)',
            }}
          >
            {statusLabel(session.phase, session.userSpeaking, session.toolPending)}
          </p>
          <button
            type="button"
            aria-label="End call"
            onClick={handleClose}
            disabled={isEnding || session.phase === 'ended'}
            className={cn(
              controlButtonClass,
              'w-11 text-[#F5F2EA]/70 hover:bg-white/5 hover:text-[#F5F2EA]'
            )}
          >
            <PhoneOff className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 py-6">
          <div className="relative" style={{ width: 196, height: 196 }}>
            <VoiceBoothRing state={avatarState} amplitude={isEnding ? 0 : session.amplitude} />
            <div className="absolute inset-[14px] flex items-center justify-center">
              <ReceptionistAvatar
                state={avatarState}
                amplitude={isEnding ? 0 : session.amplitude}
                size={168}
              />
            </div>
          </div>

          {isEnding ? (
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: 'rgba(245,242,234,0.85)' }}
              role="status"
            >
              <Loader2
                className="size-4 shrink-0 animate-spin"
                style={{ color: BOOTH.amber }}
                aria-hidden
              />
              <span>Saving conversation…</span>
            </div>
          ) : null}

          {showWave ? (
            <VoiceMicWaveform
              amplitude={session.amplitude}
              active={
                session.phase === 'listening' ||
                session.userSpeaking ||
                session.phase === 'speaking'
              }
            />
          ) : null}

          {session.errorMessage ? (
            <p role="alert" className="max-w-xs text-center text-sm text-red-300">
              {session.errorMessage}
            </p>
          ) : null}

          {!isEnding && captionLines.length > 0 ? (
            <div className="flex w-full max-w-sm flex-col gap-2 px-1">
              {captionLines.map((line, i) => {
                const guest = line.role === 'guest';
                return (
                  <div
                    key={`${line.role}-${i}-${line.text.slice(0, 24)}`}
                    className={cn(
                      'w-fit max-w-full rounded-2xl px-3 py-2 text-left text-sm leading-snug',
                      guest
                        ? 'bg-[#3D9B6A]/28 self-end text-[#F5F2EA]'
                        : 'self-start bg-[#1A221C] text-[#F5F2EA]/90'
                    )}
                  >
                    {guest ? (
                      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {line.text}
                      </p>
                    ) : (
                      <ChatRichBody
                        text={line.text}
                        compactMaps
                        className="text-[#F5F2EA]/90 [&_a]:text-[#C4A35A] [&_p]:text-[#F5F2EA]/90"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div
          className="flex shrink-0 items-center justify-center gap-4 border-t px-4 py-3.5"
          style={{ borderColor: 'rgba(196,163,90,0.22)', backgroundColor: BOOTH.fill }}
        >
          <button
            type="button"
            aria-label={session.muted ? 'Unmute microphone' : 'Mute microphone'}
            aria-pressed={session.muted}
            onClick={session.toggleMute}
            disabled={
              session.phase === 'connecting' ||
              session.phase === 'ending' ||
              session.phase === 'ended' ||
              session.phase === 'error'
            }
            className={cn(
              controlButtonClass,
              'size-12 border',
              session.muted
                ? 'border-white/20 bg-white/10 text-[#F5F2EA]'
                : 'border-[#3D9B6A]/50 bg-[#0F1410] text-[#F5F2EA] hover:bg-white/5'
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
            className={cn(controlButtonClass, 'size-12 bg-red-600 text-white hover:bg-red-500')}
          >
            {isEnding ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <PhoneOff className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
