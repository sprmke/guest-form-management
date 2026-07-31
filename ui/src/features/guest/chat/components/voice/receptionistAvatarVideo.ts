/**
 * Segment timings for `receptionist-turtle-talk.mp4` (9:16 HeyGen full-body clip, 25fps).
 * Spliced: cute wave | talk loop | outro — goofy ~2.6–4s original removed.
 * Avatar plays **loop only** while AI audio is active (`phase === 'speaking'`).
 */
export const TURTLE_TALK_VIDEO_SRC = '/avatars/receptionist-turtle-talk.mp4';
export const TURTLE_IDLE_POSTER_SRC = '/avatars/receptionist-turtle-idle.png';

/** Full-body portrait in circular booth — light crop; object-position centers the turtle. */
export const TURTLE_AVATAR_CROP_ZOOM = 1.2;
export const TURTLE_AVATAR_TRANSFORM_ORIGIN = '50% 5%';
export const TURTLE_AVATAR_OBJECT_POSITION = '50% 46%';

export const TURTLE_VIDEO_SEGMENTS = {
  /** Smiling talk loop — plays only while Gemini audio is playing. */
  loop: { start: 0.6, end: 8.1 },
  /** Idle poster frame (end of source outro). */
  idleAt: 11.04,
} as const;

export type TurtlePlaybackPhase = 'idle' | 'loop';
