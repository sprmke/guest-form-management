import { useEffect, useRef } from 'react';

import { Mic, MicOff, PhoneOff } from 'lucide-react';

import {
  ReceptionistAvatar,
  type ReceptionistAvatarState,
} from '@/features/guest/chat/components/voice/ReceptionistAvatar';
import {
  useVoiceSession,
  type VoiceSessionPhase,
} from '@/features/guest/chat/hooks/useVoiceSession';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Props = {
  propertySlug: string;
  onClose: () => void;
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

function statusLabel(phase: VoiceSessionPhase): string {
  switch (phase) {
    case 'connecting':
      return 'Connecting…';
    case 'listening':
      return 'Listening';
    case 'thinking':
      return 'Thinking…';
    case 'speaking':
      return 'Speaking';
    case 'ending':
      return 'Ending…';
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

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    openedAtRef.current = Date.now();
    session.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start exactly once on mount
  }, []);

  useEffect(() => {
    // 'error' (mic denied, caps hit, connection lost, …) stays open until the guest
    // dismisses it manually — auto-closing a message they haven't had time to read yet
    // is worse than requiring one extra tap.
    if (session.phase === 'error') return;
    if (session.phase !== 'ended') return;
    closeTimeoutRef.current = setTimeout(onClose, session.errorMessage ? 2200 : 700);
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [session.phase, session.errorMessage, onClose]);

  const handleClose = () => {
    session.end('guest_ended');
    onClose();
  };

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    // Ignore dismiss events in the first 400ms (dropdown→dialog focus race).
    if (Date.now() - openedAtRef.current < 400) return;
    handleClose();
  };

  const captionLines = [...session.captions.slice(-3), session.liveCaption].filter(
    (c): c is NonNullable<typeof c> => !!c?.text.trim()
  );

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(event) => {
          if (Date.now() - openedAtRef.current < 400) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (Date.now() - openedAtRef.current < 400) {
            event.preventDefault();
          }
        }}
        className="flex h-[min(92dvh,720px)] max-h-[min(94dvh,720px)] w-full max-w-[min(calc(100vw-1.5rem),26rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-sm"
      >
        <DialogTitle className="sr-only">Voice receptionist</DialogTitle>

        <div className="border-border flex shrink-0 items-center justify-between border-b px-3 py-2.5">
          <span className="text-muted-foreground w-11 text-xs font-medium tabular-nums">
            {formatCountdown(session.remainingSeconds)}
          </span>
          <p
            aria-live="polite"
            className="text-muted-foreground text-xs font-medium uppercase tracking-wider"
          >
            {statusLabel(session.phase)}
          </p>
          <button
            type="button"
            aria-label="End call"
            onClick={handleClose}
            className={cn(
              controlButtonClass,
              'text-muted-foreground hover:bg-muted hover:text-foreground w-11'
            )}
          >
            <PhoneOff className="size-5" aria-hidden />
          </button>
        </div>

        <div className="bg-muted/20 flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 py-6">
          <ReceptionistAvatar
            state={toAvatarState(session.phase)}
            amplitude={session.amplitude}
            size={172}
          />

          {session.errorMessage ? (
            <p role="alert" className="text-destructive max-w-xs text-center text-sm">
              {session.errorMessage}
            </p>
          ) : null}

          {captionLines.length > 0 ? (
            <div className="w-full max-w-xs space-y-1.5">
              {captionLines.map((line, i) => (
                <p
                  key={i}
                  className={cn(
                    'text-sm leading-snug',
                    line.role === 'guest'
                      ? 'text-foreground text-right'
                      : 'text-muted-foreground text-left'
                  )}
                >
                  {line.text}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="border-border flex shrink-0 items-center justify-center gap-4 border-t px-4 py-3.5">
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
                ? 'bg-muted text-foreground border-border'
                : 'bg-background text-foreground border-border hover:bg-muted'
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
            className={cn(
              controlButtonClass,
              'bg-destructive text-destructive-foreground size-12 hover:opacity-90'
            )}
          >
            <PhoneOff className="size-5" aria-hidden />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
