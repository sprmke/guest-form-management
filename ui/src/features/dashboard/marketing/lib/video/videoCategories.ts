/** Video-only campaign categories — independent of Design's CampaignCategory. */
export type VideoCategory =
  'soft-stay' | 'flash-deal' | 'last-openings' | 'social-proof' | 'fully-booked' | 'seasonal';

export const VIDEO_CATEGORIES: VideoCategory[] = [
  'soft-stay',
  'flash-deal',
  'last-openings',
  'social-proof',
  'fully-booked',
  'seasonal',
];

export const VIDEO_CATEGORY_LABELS: Record<VideoCategory, string> = {
  'soft-stay': 'Soft stay',
  'flash-deal': 'Flash deal',
  'last-openings': 'Last openings',
  'social-proof': 'Social proof',
  'fully-booked': 'Fully booked',
  seasonal: 'Seasonal',
};

export function isVideoCategory(value: string): value is VideoCategory {
  return VIDEO_CATEGORIES.includes(value as VideoCategory);
}
