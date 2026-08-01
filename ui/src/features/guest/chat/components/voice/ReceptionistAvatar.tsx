import { useCallback, useEffect, useRef, useState } from 'react';

import type { ReceptionistAvatarState } from '@/features/guest/chat/components/voice/receptionistAvatarTypes';
import {
  TURTLE_AVATAR_CROP_ZOOM,
  TURTLE_AVATAR_OBJECT_POSITION,
  TURTLE_AVATAR_TRANSFORM_ORIGIN,
  TURTLE_IDLE_POSTER_SRC,
  TURTLE_TALK_VIDEO_SRC,
  TURTLE_VIDEO_SEGMENTS,
} from '@/features/guest/chat/components/voice/receptionistAvatarVideo';
import { ReceptionistFacePlate } from '@/features/guest/chat/components/voice/ReceptionistFacePlate';

import { cn } from '@/lib/utils';

export type { ReceptionistAvatarState };

const FADE_MS = 200;
const LOOP_EPS = 0.04;

const MOTION_STYLE = {
  transition: `opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out`,
  transformOrigin: TURTLE_AVATAR_TRANSFORM_ORIGIN,
} as const;

type Props = {
  state: ReceptionistAvatarState;
  /** Live mic/output amplitude, roughly 0..1. */
  amplitude?: number;
  size?: number;
  className?: string;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Full-body HeyGen turtle in a circular booth. Talk loop plays **only** while
 * `state === 'speaking'` (same gate as AI PCM playback). Idle still otherwise.
 */
export function ReceptionistAvatar({ state, amplitude = 0, size = 160, className }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const speakingRef = useRef(false);
  const [failed, setFailed] = useState(false);

  const reducedMotion = prefersReducedMotion();
  const amp = Math.max(0, Math.min(1, amplitude));
  /** Strict sync with AI audio — no outro/intro after speech ends. */
  const speaking = state === 'speaking' && !reducedMotion;
  const thinking = state === 'thinking';
  const showTalkVideo = speaking;
  const scale =
    TURTLE_AVATAR_CROP_ZOOM + (reducedMotion ? 0 : speaking ? amp * 0.012 : thinking ? 0.008 : 0);
  const translateY = reducedMotion ? 0 : speaking ? -amp * 1 : thinking ? -1 : 0;
  const transform = `translateY(${translateY}px) scale(${scale})`;
  const mediaPosition = { objectPosition: TURTLE_AVATAR_OBJECT_POSITION };

  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  const pauseAtIdle = useCallback((video: HTMLVideoElement) => {
    video.pause();
    window.setTimeout(() => {
      try {
        video.currentTime = TURTLE_VIDEO_SEGMENTS.idleAt;
      } catch {
        // ignore seek before metadata
      }
    }, FADE_MS);
  }, []);

  const seekAndPlay = useCallback((video: HTMLVideoElement, time: number) => {
    video.muted = true;
    const run = () => {
      try {
        if (Math.abs(video.currentTime - time) > 0.05) {
          video.currentTime = time;
        }
      } catch {
        // ignore seek before metadata
      }
      const play = video.play();
      if (play && typeof play.catch === 'function') {
        play.catch(() => {
          // Autoplay can still fail on some browsers even when muted.
        });
      }
    };
    if (video.readyState >= 1) {
      run();
    } else {
      video.addEventListener('loadedmetadata', run, { once: true });
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || failed) return;

    if (speaking) {
      seekAndPlay(video, TURTLE_VIDEO_SEGMENTS.loop.start);
      return;
    }

    pauseAtIdle(video);
  }, [speaking, failed, seekAndPlay, pauseAtIdle]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || failed) return;

    const onTimeUpdate = () => {
      if (!speakingRef.current) return;
      const { loop } = TURTLE_VIDEO_SEGMENTS;
      if (video.currentTime >= loop.end - LOOP_EPS) {
        try {
          video.currentTime = loop.start;
        } catch {
          // ignore
        }
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [failed]);

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-[#B8E0C8] ring-1 ring-[#C4A35A]/30',
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {failed ? (
        <ReceptionistFacePlate state={state} amplitude={amplitude} size={size} />
      ) : (
        <>
          <img
            src={TURTLE_IDLE_POSTER_SRC}
            alt=""
            width={size}
            height={size}
            className={cn(
              'absolute inset-0 h-full w-full object-cover',
              showTalkVideo ? 'opacity-0' : 'opacity-100',
              state === 'connecting' && !showTalkVideo && 'opacity-80',
              state === 'error' && !showTalkVideo && 'opacity-65 grayscale'
            )}
            style={{ ...MOTION_STYLE, transform, ...mediaPosition }}
            onError={() => setFailed(true)}
          />
          <video
            ref={videoRef}
            src={TURTLE_TALK_VIDEO_SRC}
            muted
            playsInline
            preload="auto"
            className={cn(
              'absolute inset-0 h-full w-full object-cover',
              showTalkVideo ? 'opacity-100' : 'opacity-0'
            )}
            style={{ ...MOTION_STYLE, transform, ...mediaPosition }}
            onError={() => setFailed(true)}
          />
        </>
      )}

      <div
        className={cn(
          'pointer-events-none absolute inset-x-[14%] bottom-0 h-[16%] rounded-full bg-[#C4A35A]/0 blur-xl',
          speaking && 'bg-[#C4A35A]/30'
        )}
        style={{
          opacity: speaking ? 0.35 + amp * 0.55 : 0,
          transition: `opacity ${FADE_MS}ms ease-out, background-color ${FADE_MS}ms ease-out`,
        }}
      />
    </div>
  );
}
