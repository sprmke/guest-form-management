import {
  VIDEO_CATEGORY_LABELS,
  type VideoCategory,
} from '@/features/dashboard/marketing/lib/video/videoCategories';
import type { VideoMotionOverride } from '@/features/dashboard/marketing/lib/video/videoMotionProfiles';
import {
  fitVideoAiSceneDurations,
  type VideoAiCategory,
  type VideoFontPairingId,
  type VideoTemplateTokens,
} from '@/features/dashboard/marketing/lib/videoAiTokens';

/** Video category chip labels for the AI generate modal — adds "Custom" on top of the real
 * `VideoCategory` set used elsewhere (sidebar folders, hand-authored template categorization). */
export const VIDEO_AI_CATEGORY_LABELS: Record<VideoAiCategory, string> = {
  ...VIDEO_CATEGORY_LABELS,
  custom: 'Custom',
};

export type VideoAiSuggestion = {
  id: string;
  title: string;
  summary: string;
  prompt: string;
  category: VideoCategory;
  /** Roughly how many scenes this vibe implies — drives the preview bars only. */
  sceneHint: number;
};

/** Featured count shown before "View more" in the generate modal. */
export const VIDEO_AI_SUGGESTIONS_PREVIEW_COUNT = 4;

export const VIDEO_AI_SUGGESTIONS: VideoAiSuggestion[] = [
  {
    id: 'quiet-welcome',
    title: 'Quiet Welcome',
    summary: 'Slow pans · soft hook · calm CTA',
    category: 'soft-stay',
    sceneHint: 4,
    prompt:
      'Quiet editorial welcome reel: slow zoom hook on the property, one calm b-roll beat, a soft amenity highlight, gentle CTA close, Instagram Story pace',
  },
  {
    id: 'golden-hour-glow',
    title: 'Golden Hour Glow',
    summary: 'Warm light · drift pans · romantic close',
    category: 'soft-stay',
    sceneHint: 4,
    prompt:
      'Golden hour ambience reel: warm drifting pans across the stay at sunset, one detail beat, a soft evening offer line, elegant closing CTA',
  },
  {
    id: 'flash-deal-punch',
    title: 'Flash Deal Punch',
    summary: 'Fast cuts · punch-in zoom · bold offer',
    category: 'flash-deal',
    sceneHint: 4,
    prompt:
      'High-energy flash deal reel: punchy zoom-in hook, quick offer reveal with percent-off, fast cut to the stay, urgent CTA close, upbeat Reels pace',
  },
  {
    id: 'countdown-clock',
    title: 'Countdown Clock',
    summary: 'Clock wipe · urgency · limited window',
    category: 'flash-deal',
    sceneHint: 3,
    prompt:
      'Limited-time countdown reel: bold hook, clock-wipe transition into the offer, tight urgent CTA — feels like a ticking clock, Instagram Reel energy',
  },
  {
    id: 'last-dates-reveal',
    title: 'Last Dates Reveal',
    summary: 'Date reveal · hold shot · book-now close',
    category: 'last-openings',
    sceneHint: 4,
    prompt:
      'Last-openings reel: hook announcing limited dates, a hold shot of the space, a dates reveal beat, decisive book-now CTA, urgent but elegant tone',
  },
  {
    id: 'guest-love-story',
    title: 'Guest Love Story',
    summary: 'Warm quote beat · gentle b-roll · plan-yours CTA',
    category: 'social-proof',
    sceneHint: 4,
    prompt:
      'Guest-love social proof reel: warm hook, a quote-style highlight beat, cozy b-roll of the stay, inviting "plan yours" CTA close',
  },
  {
    id: 'waitlist-invite',
    title: 'Waitlist Invite',
    summary: 'Soft hold · fully booked · join waitlist',
    category: 'fully-booked',
    sceneHint: 3,
    prompt:
      'Fully booked waitlist reel: calm hook announcing the month is full, a soft message beat inviting guests to join the waitlist, warm closing CTA',
  },
  {
    id: 'seasonal-glow',
    title: 'Seasonal Glow',
    summary: 'Diagonal drift · festive offer · reserve early',
    category: 'seasonal',
    sceneHint: 4,
    prompt:
      'Seasonal getaway reel: cozy hook tied to the season, a diagonal drift b-roll beat, a festive offer line, reserve-early CTA close',
  },
];

export type VideoAiDurationOption = {
  value: 'auto' | 8 | 10 | 12 | 15 | 20 | 25;
  label: string;
  hint: string;
  /** Target total runtime in seconds — null lets the AI's own total stand (still floored). */
  seconds: number | null;
};

export type VideoAiFontOption = {
  value: VideoFontPairingId | 'auto';
  label: string;
  hint: string;
  sample: string;
  fontFamily: string;
};

export type VideoAiMotionOption = {
  value: 'auto' | 'calm' | 'energetic' | 'cinematic';
  label: string;
  hint: string;
  preview: 'auto' | 'calm' | 'energetic' | 'cinematic';
};

/** Floor applied whenever the host leaves Duration on Auto — never a too-short clip. */
export const VIDEO_AI_DEFAULT_TARGET_SECONDS = 12;

export const VIDEO_AI_DURATION_OPTIONS: VideoAiDurationOption[] = [
  { value: 'auto', label: 'Auto', hint: '~12s', seconds: null },
  { value: 8, label: '8s', hint: 'Quick', seconds: 8 },
  { value: 10, label: '10s', hint: 'Standard', seconds: 10 },
  { value: 12, label: '12s', hint: 'Standard+', seconds: 12 },
  { value: 15, label: '15s', hint: 'Extended', seconds: 15 },
  { value: 20, label: '20s', hint: 'Long', seconds: 20 },
  { value: 25, label: '25s', hint: 'Max', seconds: 25 },
];

export const VIDEO_AI_FONT_OPTIONS: VideoAiFontOption[] = [
  {
    value: 'auto',
    label: 'Auto',
    hint: 'AI picks',
    sample: 'Aa',
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
  },
  {
    value: 'editorial-serif',
    label: 'Editorial',
    hint: 'Fraunces',
    sample: 'Aa',
    fontFamily: 'Fraunces, Georgia, serif',
  },
  {
    value: 'cinematic-serif',
    label: 'Cinematic',
    hint: 'Cormorant',
    sample: 'Aa',
    fontFamily: 'Cormorant Garamond, Georgia, serif',
  },
  {
    value: 'modern-sans',
    label: 'Modern',
    hint: 'Space Grotesk',
    sample: 'Aa',
    fontFamily: 'Space Grotesk, Plus Jakarta Sans, sans-serif',
  },
  {
    value: 'warm-serif',
    label: 'Warm',
    hint: 'Lora',
    sample: 'Aa',
    fontFamily: 'Lora, Georgia, serif',
  },
];

export const VIDEO_AI_MOTION_OPTIONS: VideoAiMotionOption[] = [
  { value: 'auto', label: 'Auto', hint: 'AI picks', preview: 'auto' },
  { value: 'calm', label: 'Calm', hint: 'Slow Ken Burns', preview: 'calm' },
  { value: 'energetic', label: 'Energetic', hint: 'Punchy cuts', preview: 'energetic' },
  { value: 'cinematic', label: 'Cinematic', hint: 'Sweeping pans', preview: 'cinematic' },
];

export const VIDEO_AI_MOTION_MOOD_POOLS: Record<
  'calm' | 'energetic' | 'cinematic',
  VideoMotionOverride[]
> = {
  calm: ['slow-zoom-in', 'hold', 'drift-up'],
  energetic: ['punch-in', 'zoom-out', 'diagonal-drift'],
  cinematic: ['pan-left', 'pan-right', 'slow-zoom-in'],
};

export const VIDEO_AI_DEFAULT_CONTENTS: Record<VideoAiCategory, string> = {
  'soft-stay': 'A calm, editorial welcome moment that sells the feeling of staying here.',
  'flash-deal': 'A limited-time discount with urgency to book direct.',
  'last-openings': 'The last remaining open dates this month, encouraging a quick booking.',
  'social-proof': 'A warm guest-love moment that builds trust in the property.',
  'fully-booked': 'A fully booked announcement that invites guests to join a waitlist.',
  seasonal: 'A seasonal moment tied to the time of year that invites a booking.',
  custom: '',
};

export type VideoAiGeneratePreferences = {
  duration: VideoAiDurationOption['value'];
  fontPairing: VideoFontPairingId | 'auto';
  motionMood: VideoAiMotionOption['value'];
  category: VideoAiCategory;
  content: string;
};

export const DEFAULT_VIDEO_AI_PREFERENCES: VideoAiGeneratePreferences = {
  duration: 'auto',
  fontPairing: 'auto',
  motionMood: 'auto',
  category: 'soft-stay',
  content: VIDEO_AI_DEFAULT_CONTENTS['soft-stay'],
};

/** Apply host style locks after AI returns (Auto leaves AI's choice, still floored). */
export function applyVideoAiPreferencesToTokens(
  tokens: VideoTemplateTokens,
  preferences: VideoAiGeneratePreferences
): VideoTemplateTokens {
  const durationOption = VIDEO_AI_DURATION_OPTIONS.find(
    (option) => option.value === preferences.duration
  );
  const currentTotal = tokens.scenes.reduce((sum, scene) => sum + scene.durationSec, 0);
  // Explicit picks are honored exactly (stretch or trim); Auto only ever stretches up to
  // the floor — a storyboard that's already generous is left alone.
  const targetSeconds =
    durationOption?.seconds ?? Math.max(currentTotal, VIDEO_AI_DEFAULT_TARGET_SECONDS);
  const scenes = fitVideoAiSceneDurations(tokens.scenes, targetSeconds);

  const moodPool =
    preferences.motionMood !== 'auto' ? VIDEO_AI_MOTION_MOOD_POOLS[preferences.motionMood] : null;
  const scenesWithMotion = moodPool
    ? scenes.map((scene, index) => ({ ...scene, motion: moodPool[index % moodPool.length]! }))
    : scenes;

  return {
    ...tokens,
    scenes: scenesWithMotion,
    fontPairing: preferences.fontPairing === 'auto' ? tokens.fontPairing : preferences.fontPairing,
    category: preferences.category,
  };
}
