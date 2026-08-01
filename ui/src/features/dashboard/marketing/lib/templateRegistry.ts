export type DesignTemplateFormat = 'instagram-post' | 'instagram-story' | 'facebook-post';

export const DESIGN_FORMAT_DIMENSIONS: Record<
  DesignTemplateFormat,
  { width: number; height: number; label: string }
> = {
  'instagram-post': { width: 1080, height: 1080, label: 'Instagram Post' },
  'instagram-story': { width: 1080, height: 1920, label: 'Instagram Story' },
  'facebook-post': { width: 1200, height: 630, label: 'Facebook Post' },
};
