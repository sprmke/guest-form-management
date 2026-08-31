import { SHOWCASE_HEADER_SOLID_THRESHOLD_PX } from '@/features/guest/marketing/showcase/lib/showcaseScroll';

/** Portaled fixed header chrome height — keep in sync with SHOWCASE_HEADER_SOLID_THRESHOLD_PX (76). */
export const SHOWCASE_HEADER_CHROME_PX = SHOWCASE_HEADER_SOLID_THRESHOLD_PX;

/**
 * Header is portaled `position:fixed` (out of flow) on live + Page Editor.
 * Heroes are full-bleed under the floating bar — no negative-margin pull-under.
 */
export const SHOWCASE_HERO_CONTAINED_CLASS = 'min-h-[min(100dvh,720px)]';
export const SHOWCASE_HERO_LIVE_CLASS = 'min-h-[100dvh]';
export const SHOWCASE_HERO_CONTENT_TOP_CONTAINED = 'pt-28';
export const SHOWCASE_HERO_CONTENT_TOP_LIVE = '@sm:pt-32 pt-28';

export function showcaseHeroSectionClass(containedChrome: boolean): string {
  return containedChrome ? SHOWCASE_HERO_CONTAINED_CLASS : SHOWCASE_HERO_LIVE_CLASS;
}

export function showcaseHeroContentTopClass(containedChrome: boolean): string {
  return containedChrome ? SHOWCASE_HERO_CONTENT_TOP_CONTAINED : SHOWCASE_HERO_CONTENT_TOP_LIVE;
}
