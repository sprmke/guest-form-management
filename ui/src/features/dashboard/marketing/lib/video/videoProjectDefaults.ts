import type {
  CampaignCategory,
  DesignBinding,
} from '@/features/dashboard/marketing/lib/designCanvasTypes';
import {
  pickBindingMediaAt,
  resolveDesignBindingMedia,
} from '@/features/dashboard/marketing/lib/propertyBindingMedia';
import {
  DEFAULT_VIDEO_MUSIC,
  VIDEO_MUSIC_CLEARED_TRACK_ID,
} from '@/features/dashboard/marketing/lib/video/videoMusicPresets';
import type {
  VideoFormat,
  VideoProject,
  VideoProjectMusic,
  VideoScene,
  VideoSceneKind,
} from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import { VIDEO_MUSIC_DEFAULT_VOLUME } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import {
  VIDEO_FPS,
  VIDEO_SCENE_DURATION,
} from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import { createSceneId } from '@/features/dashboard/marketing/lib/video/videoProjectUtils';
import { normalizeSceneLayers } from '@/features/dashboard/marketing/lib/video/videoSceneLayers';
import {
  defaultTextLayoutForSceneKind,
  normalizeSceneTextLayout,
} from '@/features/dashboard/marketing/lib/video/videoTextSlots';
import { defaultVideoFields } from '@/features/dashboard/marketing/lib/videoCampaignTemplates';

function normalizeScene(scene: VideoScene): VideoScene {
  return normalizeSceneLayers(normalizeSceneTextLayout(scene));
}

function sceneTexts(templateId: string, binding: DesignBinding) {
  return defaultVideoFields(templateId, binding);
}

type SceneBackground = {
  url: string | null;
  mediaType: 'image' | 'video';
};

function photoScene(
  label: string,
  background: SceneBackground,
  transition: VideoScene['transition'],
  texts: ReturnType<typeof sceneTexts>,
  headlineOnly = false
): VideoScene {
  return {
    id: createSceneId(),
    kind: 'photo',
    label,
    durationSec: VIDEO_SCENE_DURATION.default,
    transition,
    imageUrl: background.url,
    backgroundMediaType: background.mediaType,
    texts: {
      headline: headlineOnly ? texts.headline : '',
      subheadline: '',
      promoLine: '',
      ctaLine: '',
      slotLabels: [],
      rulesLine: '',
    },
    textLayout: defaultTextLayoutForSceneKind('photo'),
  };
}

function contentScene(
  kind: VideoSceneKind,
  label: string,
  background: SceneBackground,
  transition: VideoScene['transition'],
  texts: ReturnType<typeof sceneTexts>,
  durationSec = VIDEO_SCENE_DURATION.default
): VideoScene {
  return {
    id: createSceneId(),
    kind,
    label,
    durationSec,
    transition,
    imageUrl: background.url,
    backgroundMediaType: background.mediaType,
    texts: {
      headline: texts.headline,
      subheadline: texts.subheadline,
      promoLine: texts.promoLine,
      ctaLine: texts.ctaLine,
      slotLabels: [...texts.slotLabels],
      rulesLine: texts.rulesLine,
    },
    textLayout: defaultTextLayoutForSceneKind(kind),
  };
}

function ctaScene(
  background: SceneBackground,
  transition: VideoScene['transition'],
  texts: ReturnType<typeof sceneTexts>
): VideoScene {
  return {
    id: createSceneId(),
    kind: 'cta',
    label: 'CTA',
    durationSec: VIDEO_SCENE_DURATION.default,
    transition,
    imageUrl: background.url,
    backgroundMediaType: background.mediaType,
    texts: {
      headline: '',
      subheadline: '',
      promoLine: '',
      ctaLine: texts.ctaLine,
      slotLabels: [],
      rulesLine: texts.rulesLine,
    },
    textLayout: defaultTextLayoutForSceneKind('cta'),
  };
}

function ctaTransitionForCategory(category: CampaignCategory): VideoScene['transition'] {
  switch (category) {
    case 'giveaway':
      return 'wipe';
    case 'fully-booked':
      return 'fade';
    default:
      return 'slide-left';
  }
}

function contentSceneForCategory(
  category: CampaignCategory,
  background: SceneBackground,
  transition: VideoScene['transition'],
  texts: ReturnType<typeof sceneTexts>
): VideoScene {
  switch (category) {
    case 'slots':
      return contentScene('slots', 'Slots', background, transition, texts);
    case 'giveaway':
      return contentScene('promo', 'Giveaway', background, transition, texts);
    case 'fully-booked':
      return contentScene('promo', 'Message', background, transition, texts);
    default:
      return contentScene('promo', 'Promo', background, transition, texts);
  }
}

/** One timeline clip per gallery item; template copy on intro, second-to-last, and CTA. */
function buildGalleryScenes(
  category: CampaignCategory,
  media: ReturnType<typeof resolveDesignBindingMedia>,
  texts: ReturnType<typeof sceneTexts>
): VideoScene[] {
  const count = media.length;
  const bg = (index: number) => pickBindingMediaAt(media, index);

  if (count === 1) {
    return [
      photoScene('Intro', bg(0), 'none', texts, true),
      ctaScene(bg(0), ctaTransitionForCategory(category), texts),
    ];
  }

  if (count === 2) {
    return [
      photoScene('Intro', bg(0), 'none', texts, true),
      ctaScene(bg(1), ctaTransitionForCategory(category), texts),
    ];
  }

  if (count === 3) {
    return [
      photoScene('Intro', bg(0), 'none', texts, true),
      contentSceneForCategory(category, bg(1), 'fade', texts),
      ctaScene(bg(2), ctaTransitionForCategory(category), texts),
    ];
  }

  const contentIndex = count - 2;
  const ctaIndex = count - 1;
  const scenes: VideoScene[] = [];

  for (let index = 0; index < count; index += 1) {
    const background = bg(index);
    const transition: VideoScene['transition'] = index === 0 ? 'none' : 'fade';

    if (index === 0) {
      scenes.push(photoScene('Intro', background, transition, texts, true));
      continue;
    }

    if (index === contentIndex) {
      scenes.push(contentSceneForCategory(category, background, transition, texts));
      continue;
    }

    if (index === ctaIndex) {
      scenes.push(ctaScene(background, ctaTransitionForCategory(category), texts));
      continue;
    }

    scenes.push(photoScene(`Photo ${index}`, background, transition, texts, false));
  }

  return scenes;
}

function normalizeProjectMusic(raw: Partial<VideoProjectMusic> | undefined): VideoProjectMusic {
  if (!raw) {
    return { ...DEFAULT_VIDEO_MUSIC };
  }

  const volume =
    typeof raw.volume === 'number'
      ? Math.min(1, Math.max(0, raw.volume))
      : VIDEO_MUSIC_DEFAULT_VOLUME;

  if (raw.trackId === VIDEO_MUSIC_CLEARED_TRACK_ID) {
    return { url: null, volume, trackId: VIDEO_MUSIC_CLEARED_TRACK_ID };
  }

  const normalized: VideoProjectMusic = {
    url: typeof raw.url === 'string' ? raw.url : null,
    volume,
    title: typeof raw.title === 'string' ? raw.title : undefined,
    artist: typeof raw.artist === 'string' ? raw.artist : undefined,
    source:
      raw.source === 'jamendo' || raw.source === 'upload' || raw.source === 'url'
        ? raw.source
        : undefined,
    trackId: typeof raw.trackId === 'string' ? raw.trackId : undefined,
  };

  if (
    !normalized.url &&
    normalized.trackId !== VIDEO_MUSIC_CLEARED_TRACK_ID &&
    !normalized.trackId &&
    !normalized.title &&
    !normalized.source
  ) {
    return { ...DEFAULT_VIDEO_MUSIC, volume };
  }

  return normalized;
}

export function buildDefaultVideoProject(
  templateId: string,
  category: CampaignCategory,
  binding: DesignBinding,
  format: VideoFormat = 'instagram-story'
): VideoProject {
  const texts = sceneTexts(templateId, binding);
  const media = resolveDesignBindingMedia({
    propertyMedia: binding.propertyMedia,
    propertyPhoto: binding.propertyPhoto,
  });

  const scenes = buildGalleryScenes(category, media, texts);

  return {
    version: 1,
    templateId,
    campaignCategory: category,
    format,
    fps: VIDEO_FPS,
    scenes: scenes.map((scene) => normalizeScene(scene)),
    music: { ...DEFAULT_VIDEO_MUSIC },
  };
}

export function parseVideoProject(
  raw: unknown,
  fallbackTemplateId: string,
  category: CampaignCategory,
  binding: DesignBinding,
  format: VideoFormat
): VideoProject {
  if (!raw || typeof raw !== 'object') {
    return buildDefaultVideoProject(fallbackTemplateId, category, binding, format);
  }

  const data = raw as Partial<VideoProject>;
  if (data.version !== 1 || !Array.isArray(data.scenes) || data.scenes.length === 0) {
    return buildDefaultVideoProject(fallbackTemplateId, category, binding, format);
  }

  return {
    version: 1,
    templateId: typeof data.templateId === 'string' ? data.templateId : fallbackTemplateId,
    campaignCategory: data.campaignCategory ?? category,
    format: data.format ?? format,
    fps: typeof data.fps === 'number' ? data.fps : VIDEO_FPS,
    scenes: data.scenes.map((scene) => normalizeScene(scene as VideoScene)),
    music: normalizeProjectMusic(data.music),
  };
}
