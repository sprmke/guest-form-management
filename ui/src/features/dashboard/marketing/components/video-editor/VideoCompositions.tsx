import { useState, type ReactNode } from 'react';

import {
  AbsoluteFill,
  Audio,
  Img,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';

import { PositionedLayer } from '@/features/dashboard/marketing/lib/video/videoCompositionLayout';
import {
  layerHasContent,
  VideoLayerBody,
} from '@/features/dashboard/marketing/lib/video/videoLayerContent';
import { VIDEO_MUSIC_DEFAULT_VOLUME } from '@/features/dashboard/marketing/lib/video/videoMusicPresets';
import type {
  VideoProject,
  VideoScene,
  VideoSceneKind,
  VideoTransition,
} from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import {
  getSceneLayers,
  sceneBackgroundLayer,
} from '@/features/dashboard/marketing/lib/video/videoSceneLayers';
import {
  sceneDurationInFrames,
  transitionDurationInFrames,
} from '@/features/dashboard/marketing/lib/video/videoProjectUtils';
import { scaleForVideoFormat } from '@/features/dashboard/marketing/lib/video/videoTextSlotContent';

export type VideoCompositionProps = {
  project: VideoProject;
  brandColor?: string;
  /** Preview-only: mutes background music in the Remotion player. */
  previewMuted?: boolean;
};

function overlayOpacityForKind(kind: VideoSceneKind): number {
  switch (kind) {
    case 'photo':
      return 0.35;
    case 'promo':
      return 0.48;
    case 'slots':
      return 0.52;
    case 'cta':
      return 0.55;
    default:
      return 0.4;
  }
}

function isRenderableMediaUrl(url: string | null | undefined): url is string {
  if (!url?.trim()) return false;
  return /^https?:\/\//i.test(url.trim()) || url.trim().startsWith('data:');
}

function SceneBackground({
  url,
  mediaType = 'image',
  zoom = 1,
}: {
  url: string | null;
  mediaType?: 'image' | 'video';
  zoom?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!isRenderableMediaUrl(url) || imageFailed) {
    return <AbsoluteFill style={{ backgroundColor: '#1e293b' }} />;
  }

  if (mediaType === 'video') {
    return (
      <Video
        src={url}
        muted
        loop
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${zoom})`,
        }}
      />
    );
  }

  return (
    <Img
      src={url}
      onError={() => setImageFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }}
    />
  );
}

function SceneLayers({ scene, brandColor }: { scene: VideoScene; brandColor: string }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const scale = scaleForVideoFormat(width, height);
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06], { extrapolateRight: 'clamp' });
  const enter = spring({ frame, fps, config: { damping: 16 } });
  const enterOffset = (1 - enter) * 24;
  const fadeIn =
    scene.kind === 'cta' ? interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' }) : 1;

  const layers = getSceneLayers(scene);
  const background = sceneBackgroundLayer(scene);
  const overlays = layers.filter((layer) => layer.kind !== 'background');

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a', opacity: fadeIn }}>
      <SceneBackground
        url={background?.imageUrl ?? null}
        mediaType={background?.mediaType ?? 'image'}
        zoom={zoom}
      />
      <AbsoluteFill
        style={{ backgroundColor: `rgba(15, 23, 42, ${overlayOpacityForKind(scene.kind)})` }}
      />
      {overlays.map((layer) => {
        if (!layerHasContent(layer)) return null;
        return (
          <PositionedLayer key={layer.id} layer={layer} scale={scale} enterOffset={enterOffset}>
            <VideoLayerBody layer={layer} brandColor={brandColor} scale={scale} />
          </PositionedLayer>
        );
      })}
    </AbsoluteFill>
  );
}

function VideoSceneFrame({ scene, brandColor }: { scene: VideoScene; brandColor: string }) {
  return <SceneLayers scene={scene} brandColor={brandColor} />;
}

function renderSceneTransition(transition: VideoTransition, key: string) {
  const durationInFrames = transitionDurationInFrames(transition);
  if (durationInFrames <= 0) return null;

  const timing = linearTiming({ durationInFrames });

  switch (transition) {
    case 'slide-left':
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={slide({ direction: 'from-left' })}
          timing={timing}
        />
      );
    case 'slide-up':
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={slide({ direction: 'from-bottom' })}
          timing={timing}
        />
      );
    case 'wipe':
      return <TransitionSeries.Transition key={key} presentation={wipe()} timing={timing} />;
    case 'fade':
    default:
      return <TransitionSeries.Transition key={key} presentation={fade()} timing={timing} />;
  }
}

export function CampaignVideoComposition({
  project,
  brandColor = '#e8752a',
  previewMuted = false,
}: VideoCompositionProps) {
  const { fps, scenes, music } = project;
  const musicUrl = music?.url?.trim() || null;
  const musicVolume = previewMuted ? 0 : (music?.volume ?? VIDEO_MUSIC_DEFAULT_VOLUME);

  if (scenes.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: '#0f172a' }} />;
  }

  const elements: ReactNode[] = [];

  scenes.forEach((scene, index) => {
    elements.push(
      <TransitionSeries.Sequence
        key={scene.id}
        durationInFrames={sceneDurationInFrames(scene, fps)}
      >
        <VideoSceneFrame scene={scene} brandColor={brandColor} />
      </TransitionSeries.Sequence>
    );

    if (index < scenes.length - 1) {
      const nextScene = scenes[index + 1]!;
      const transition = renderSceneTransition(nextScene.transition, `${scene.id}-transition`);
      if (transition) elements.push(transition);
    }
  });

  return (
    <AbsoluteFill>
      {musicUrl ? <Audio src={musicUrl} volume={musicVolume} /> : null}
      <TransitionSeries>{elements}</TransitionSeries>
    </AbsoluteFill>
  );
}

/** @deprecated Legacy — kept for saved templates referencing old composition id */
export type VideoTemplateProps = VideoCompositionProps;

export function PropertyShowcaseComposition(props: VideoCompositionProps) {
  return <CampaignVideoComposition {...props} />;
}

export function AvailabilityPromoComposition(props: VideoCompositionProps) {
  return <CampaignVideoComposition {...props} />;
}

export function BookingPromoComposition(props: VideoCompositionProps) {
  return <CampaignVideoComposition {...props} />;
}
