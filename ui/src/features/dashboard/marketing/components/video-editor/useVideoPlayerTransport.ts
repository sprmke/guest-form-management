import { useCallback, useEffect, useRef, useState } from 'react';

import type { VideoProject } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import {
  sceneEndFrame,
  sceneFrameRange,
  sceneIndexAtFrame,
  sceneSettledPreviewFrame,
  videoProjectDurationInFrames,
} from '@/features/dashboard/marketing/lib/video/videoProjectUtils';

import type { PlayerRef } from '@remotion/player';

function isPageHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden;
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, seconds);
  const mins = Math.floor(whole / 60);
  const secs = Math.floor(whole % 60);
  const tenths = Math.floor((whole % 1) * 10);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${secs}.${tenths}s`;
}

export type VideoPreviewMode = 'all' | 'clip';

type Options = {
  playerRef: React.RefObject<PlayerRef | null>;
  project: VideoProject | null;
  selectedSceneIndex: number;
  previewMode: VideoPreviewMode;
  compositionKey: string;
};

export function useVideoPlayerTransport({
  playerRef,
  project,
  selectedSceneIndex,
  previewMode,
  compositionKey,
}: Options) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const loopGuardRef = useRef(false);
  const isPlayingRef = useRef(false);

  const durationInFrames = project ? videoProjectDurationInFrames(project) : 1;
  const fps = project?.fps ?? 30;
  const durationSec = durationInFrames / fps;
  const currentSec = currentFrame / fps;

  const activeSceneIndex = project ? sceneIndexAtFrame(project, currentFrame) : 0;

  useEffect(() => {
    setCurrentFrame(0);
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, [compositionKey]);

  useEffect(() => {
    const pauseIfHidden = () => {
      if (!isPageHidden()) return;
      playerRef.current?.pause();
    };

    document.addEventListener('visibilitychange', pauseIfHidden);
    return () => {
      document.removeEventListener('visibilitychange', pauseIfHidden);
      playerRef.current?.pause();
      isPlayingRef.current = false;
    };
  }, [playerRef]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const syncFrame = () => {
      const frame = player.getCurrentFrame();
      setCurrentFrame(frame);

      if (!project || previewMode !== 'clip' || !isPlayingRef.current) return;
      if (loopGuardRef.current) return;
      if (isPageHidden()) {
        player.pause();
        return;
      }

      const { start, end } = sceneFrameRange(project, selectedSceneIndex);
      const lastFrame = Math.max(start, end - 1);
      if (frame >= lastFrame) {
        loopGuardRef.current = true;
        player.seekTo(start);
        setCurrentFrame(start);
        requestAnimationFrame(() => {
          loopGuardRef.current = false;
        });
      }
    };

    const onPlay = () => {
      if (isPageHidden()) {
        player.pause();
        return;
      }
      isPlayingRef.current = true;
      setIsPlaying(true);
    };
    const onPause = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
    };
    const onEnded = () => {
      if (!project || previewMode !== 'clip') {
        setIsPlaying(false);
        return;
      }
      if (isPageHidden()) {
        setIsPlaying(false);
        return;
      }
      const { start } = sceneFrameRange(project, selectedSceneIndex);
      player.seekTo(start);
      void player.play();
    };

    syncFrame();
    player.addEventListener('frameupdate', syncFrame);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('ended', onEnded);

    return () => {
      player.removeEventListener('frameupdate', syncFrame);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('ended', onEnded);
      player.pause();
      isPlayingRef.current = false;
    };
  }, [playerRef, compositionKey, project, previewMode, selectedSceneIndex]);

  const seekToFrame = useCallback(
    (frame: number) => {
      const player = playerRef.current;
      if (!player || !project) return;
      const clamped = Math.max(0, Math.min(frame, durationInFrames - 1));
      player.seekTo(clamped);
      setCurrentFrame(clamped);
    },
    [playerRef, project, durationInFrames]
  );

  const play = useCallback(() => {
    void playerRef.current?.play();
  }, [playerRef]);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, [playerRef]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlayingRef.current) {
      player.pause();
    } else {
      void player.play();
    }
  }, [playerRef]);

  const stop = useCallback(() => {
    const player = playerRef.current;
    if (!player || !project) return;
    player.pause();
    const frame =
      previewMode === 'clip' ? sceneSettledPreviewFrame(project, selectedSceneIndex) : 0;
    player.seekTo(frame);
    setCurrentFrame(frame);
    setIsPlaying(false);
  }, [playerRef, project, previewMode, selectedSceneIndex]);

  const seekToScene = useCallback(
    (sceneIndex: number) => {
      if (!project) return;
      const index = Math.max(0, Math.min(sceneIndex, project.scenes.length - 1));
      seekToFrame(sceneSettledPreviewFrame(project, index));
    },
    [project, seekToFrame]
  );

  const playFromStart = useCallback(() => {
    if (!project) return;
    seekToFrame(0);
    void playerRef.current?.play();
  }, [project, playerRef, seekToFrame]);

  const playSelectedClip = useCallback(() => {
    if (!project) return;
    seekToScene(selectedSceneIndex);
    void playerRef.current?.play();
  }, [project, playerRef, seekToScene, selectedSceneIndex]);

  const toggleMute = useCallback(() => {
    setIsMuted((value) => !value);
  }, []);

  const clipDurationSec = useCallback(() => {
    if (!project) return 0;
    const { start, end } = sceneFrameRange(project, selectedSceneIndex);
    return Math.max(0.1, (end - start) / fps);
  }, [project, selectedSceneIndex, fps]);

  const clipCurrentSec = useCallback(() => {
    if (!project) return 0;
    const { start, end } = sceneFrameRange(project, selectedSceneIndex);
    const relative = Math.max(0, Math.min(currentFrame, end - 1) - start);
    return relative / fps;
  }, [project, selectedSceneIndex, currentFrame, fps]);

  const displayCurrentSec = previewMode === 'clip' ? clipCurrentSec() : currentSec;
  const displayDurationSec = previewMode === 'clip' ? clipDurationSec() : durationSec;

  return {
    currentFrame,
    currentSec,
    durationSec,
    durationInFrames,
    displayCurrentSec,
    displayDurationSec,
    isPlaying,
    isMuted,
    activeSceneIndex,
    formatTime,
    seekToFrame,
    seekToScene,
    play,
    pause,
    togglePlay,
    stop,
    playFromStart,
    playSelectedClip,
    toggleMute,
    sceneEndFrame: (index: number) => (project ? sceneEndFrame(project, index) : 0),
  };
}
