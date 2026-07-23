import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useActiveSceneIndex } from '@/features/dashboard/marketing/components/video-editor/useActiveSceneIndex';
import type { VideoPreviewMode } from '@/features/dashboard/marketing/components/video-editor/useVideoPlayerTransport';
import type { VideoCompositionProps } from '@/features/dashboard/marketing/components/video-editor/VideoCompositions';
import { VideoPlaybackControls } from '@/features/dashboard/marketing/components/video-editor/VideoPlaybackControls';
import { VideoRemotionPlayer } from '@/features/dashboard/marketing/components/video-editor/VideoRemotionPlayer';
import { VideoTextPositionOverlay } from '@/features/dashboard/marketing/components/video-editor/VideoTextPositionOverlay';
import {
  VIDEO_FORMAT_DIMENSIONS,
  VIDEO_PREVIEW_SHELL_MIN_HEIGHT_CLASS,
  fitVideoPreviewFrameSize,
} from '@/features/dashboard/marketing/lib/video/videoFormatDimensions';
import type {
  VideoFormat,
  VideoProject,
} from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import {
  sceneStartFrame,
  updateScene,
} from '@/features/dashboard/marketing/lib/video/videoProjectUtils';
import {
  updateSceneLayerPosition,
  updateSceneLayer,
} from '@/features/dashboard/marketing/lib/video/videoSceneLayers';
import { scaleForVideoFormat } from '@/features/dashboard/marketing/lib/video/videoTextSlotContent';

import { cn } from '@/lib/utils';

import type { PlayerRef } from '@remotion/player';

type Props = {
  playerRef: React.RefObject<PlayerRef | null>;
  project: VideoProject;
  format: VideoFormat;
  durationInFrames: number;
  inputProps: VideoCompositionProps;
  selectedSceneIndex: number;
  previewMode: VideoPreviewMode;
  onPreviewModeChange: (mode: VideoPreviewMode) => void;
  onPlayingChange?: (playing: boolean) => void;
  onProjectChange: (project: VideoProject) => void;
  compositionKey: string;
  selectedElementId?: string | null;
  onHighlightElement?: (layerId: string) => void;
  onCanvasSelectElement?: (layerId: string, sceneId: string) => void;
};

export function VideoPreviewWorkspace({
  playerRef,
  project,
  format,
  durationInFrames,
  inputProps,
  selectedSceneIndex,
  previewMode,
  onPreviewModeChange,
  onPlayingChange,
  onProjectChange,
  compositionKey,
  selectedElementId = null,
  onHighlightElement,
  onCanvasSelectElement,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);

  const dimensions = VIDEO_FORMAT_DIMENSIONS[format];
  const previewMaxWidth = format === 'landscape' ? 640 : format === 'instagram-post' ? 400 : 360;
  const compositionScale = scaleForVideoFormat(dimensions.width, dimensions.height);
  const brandColor = typeof inputProps.brandColor === 'string' ? inputProps.brandColor : '#e8752a';

  const measurePreviewFrame = useCallback(() => {
    const node = previewAreaRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const maxWidth = isFullscreen ? rect.width : previewMaxWidth;
    const next = fitVideoPreviewFrameSize(rect.width, rect.height, format, maxWidth);
    setFrameSize((prev) =>
      prev?.width === next.width && prev?.height === next.height ? prev : next
    );
  }, [format, isFullscreen, previewMaxWidth]);

  useLayoutEffect(() => {
    measurePreviewFrame();
    const node = previewAreaRef.current;
    if (!node) return;

    const observer = new ResizeObserver(() => measurePreviewFrame());
    observer.observe(node);
    return () => observer.disconnect();
  }, [measurePreviewFrame]);

  const editingSceneIndex = useActiveSceneIndex(
    playerRef,
    project,
    previewMode,
    selectedSceneIndex,
    previewPlaying
  );
  const editingScene = project.scenes[editingSceneIndex];

  useEffect(() => {
    onPlayingChange?.(previewPlaying);
  }, [previewPlaying, onPlayingChange]);

  const toggleFullscreen = useCallback(async () => {
    const node = shellRef.current;
    if (!node) return;

    if (!document.fullscreenElement) {
      try {
        await node.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        setIsFullscreen(false);
      }
      return;
    }

    await document.exitFullscreen();
    setIsFullscreen(false);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      requestAnimationFrame(() => measurePreviewFrame());
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [measurePreviewFrame]);

  const previewFrameStyle = useMemo(() => {
    if (frameSize && frameSize.width > 0) {
      return { width: frameSize.width, height: frameSize.height };
    }
    return {
      width: previewMaxWidth,
      aspectRatio: `${dimensions.width} / ${dimensions.height}`,
      maxHeight: '100%',
    };
  }, [frameSize, previewMaxWidth, dimensions.width, dimensions.height]);

  const sceneSegments = useMemo(() => {
    return project.scenes.map((scene, index) => {
      const start = sceneStartFrame(project, index);
      const end =
        index + 1 < project.scenes.length ? sceneStartFrame(project, index + 1) : durationInFrames;
      const span = Math.max(1, end - start);
      return {
        id: scene.id,
        startPct: (start / durationInFrames) * 100,
        widthPct: (span / durationInFrames) * 100,
        index,
      };
    });
  }, [project, durationInFrames]);

  return (
    <div
      ref={shellRef}
      className={cn(
        'bg-muted/30 flex min-h-0 flex-1 flex-col overflow-hidden',
        !isFullscreen && VIDEO_PREVIEW_SHELL_MIN_HEIGHT_CLASS,
        isFullscreen && 'bg-background h-dvh w-dvw'
      )}
    >
      <div
        ref={previewAreaRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-5"
      >
        <div
          className="border-border bg-background relative max-h-full max-w-full shrink-0 overflow-hidden rounded-lg border shadow-sm"
          style={previewFrameStyle}
        >
          <div className="relative size-full">
            <div className="pointer-events-none size-full">
              <VideoRemotionPlayer
                playerRef={playerRef}
                compositionKey={compositionKey}
                durationInFrames={durationInFrames}
                fps={project.fps}
                width={dimensions.width}
                height={dimensions.height}
                inputProps={inputProps}
                previewMuted={previewMuted}
              />
            </div>
            {editingScene ? (
              <VideoTextPositionOverlay
                scene={editingScene}
                brandColor={brandColor}
                compositionScale={compositionScale}
                previewWidthPx={frameSize?.width ?? previewMaxWidth}
                compositionWidth={dimensions.width}
                selectedElementId={selectedElementId}
                onSelectElement={onHighlightElement}
                onActivateElement={(layerId) => onCanvasSelectElement?.(layerId, editingScene.id)}
                onLayerPositionChange={(layerId, position) => {
                  onProjectChange(
                    updateScene(
                      project,
                      editingScene.id,
                      updateSceneLayerPosition(editingScene, layerId, position)
                    )
                  );
                }}
                onLayerWidthChange={(layerId, widthPct) => {
                  onProjectChange(
                    updateScene(
                      project,
                      editingScene.id,
                      updateSceneLayer(editingScene, layerId, { widthPct })
                    )
                  );
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <VideoPlaybackControls
        playerRef={playerRef}
        project={project}
        selectedSceneIndex={selectedSceneIndex}
        previewMode={previewMode}
        onPreviewModeChange={onPreviewModeChange}
        compositionKey={compositionKey}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => void toggleFullscreen()}
        onPlayingChange={setPreviewPlaying}
        onMutedChange={setPreviewMuted}
        sceneSegments={sceneSegments}
        editingSceneIndex={editingSceneIndex}
      />
    </div>
  );
}
