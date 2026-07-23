import type { CampaignCategory } from '@/features/dashboard/marketing/lib/designCanvasTypes';
import type {
  VideoSceneTextLayout,
  VideoTextSlotId,
} from '@/features/dashboard/marketing/lib/video/videoTextSlots';

export type VideoFormat = 'instagram-story' | 'instagram-post' | 'landscape';

export type VideoTransition = 'none' | 'fade' | 'slide-left' | 'slide-up' | 'wipe';

export type VideoSceneKind = 'photo' | 'promo' | 'slots' | 'cta';

export type VideoSceneTextFields = {
  headline: string;
  subheadline: string;
  promoLine: string;
  ctaLine: string;
  slotLabels: string[];
  rulesLine: string;
};

export type VideoLayerKind = 'background' | 'image' | 'logo' | 'text' | 'cta' | 'slots';

export type VideoTextStyle = 'headline' | 'subheadline' | 'promo' | 'body' | 'footer';

export type VideoLayerPosition = {
  x: number;
  y: number;
  align?: 'left' | 'center' | 'right';
};

export type VideoLayerTypography = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  /** Text outline for readability on busy backgrounds */
  strokeColor?: string | null;
  strokeWidth?: number;
  shadow?: boolean;
  /** CTA pill fill */
  backgroundColor?: string | null;
};

export type VideoSceneLayer = {
  id: string;
  kind: VideoLayerKind;
  imageUrl?: string | null;
  mediaType?: 'image' | 'video';
  text?: string;
  lines?: string[];
  /** @deprecated Quick preset seed — custom typography overrides when set. */
  textStyle?: VideoTextStyle;
  typography?: VideoLayerTypography;
  position: VideoLayerPosition;
  /** Overlay image width as % of frame width */
  widthPct?: number;
};

/** Selected element in the editor — a layer id. */
export type VideoSceneElementId = string;

export type VideoScene = {
  id: string;
  kind: VideoSceneKind;
  label: string;
  durationSec: number;
  transition: VideoTransition;
  imageUrl: string | null;
  /** Background clip media type (`imageUrl` holds the asset URL for both). */
  backgroundMediaType?: 'image' | 'video';
  texts: VideoSceneTextFields;
  /** Layer stack (background first, overlays on top). */
  layers?: VideoSceneLayer[];
  /** @deprecated Legacy — synced from layers for older saves. */
  textLayout?: VideoSceneTextLayout;
  /** @deprecated Legacy — synced from layers. */
  hiddenElements?: string[];
};

export type VideoProjectMusicSource = 'jamendo' | 'upload' | 'url';

export type VideoProjectMusic = {
  url: string | null;
  volume: number;
  title?: string;
  artist?: string;
  source?: VideoProjectMusicSource;
  trackId?: string;
};

export type VideoProject = {
  version: 1;
  templateId: string;
  campaignCategory: CampaignCategory;
  format: VideoFormat;
  fps: number;
  scenes: VideoScene[];
  music?: VideoProjectMusic;
};

export const VIDEO_TRANSITION_FRAMES = 15;

export const VIDEO_FPS = 30;

export const VIDEO_SCENE_DURATION = {
  min: 1,
  max: 8,
  default: 3,
} as const;

export const VIDEO_MUSIC_DEFAULT_VOLUME = 0.45;
