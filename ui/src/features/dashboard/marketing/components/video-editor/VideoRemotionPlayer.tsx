import { memo, useMemo } from 'react';

import { Player, type PlayerRef } from '@remotion/player';

import {
  CampaignVideoComposition,
  type VideoCompositionProps,
} from '@/features/dashboard/marketing/components/video-editor/VideoCompositions';

type Props = {
  playerRef: React.RefObject<PlayerRef | null>;
  compositionKey: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  inputProps: VideoCompositionProps;
  previewMuted: boolean;
};

export const VideoRemotionPlayer = memo(function VideoRemotionPlayer({
  playerRef,
  compositionKey,
  durationInFrames,
  fps,
  width,
  height,
  inputProps,
  previewMuted,
}: Props) {
  const playerInputProps = useMemo(
    () => ({ ...inputProps, previewMuted }),
    [inputProps, previewMuted]
  );

  return (
    <Player
      ref={playerRef}
      key={compositionKey}
      component={CampaignVideoComposition}
      durationInFrames={durationInFrames}
      compositionWidth={width}
      compositionHeight={height}
      fps={fps}
      inputProps={playerInputProps}
      style={{ width: '100%', height: '100%', display: 'block' }}
      controls={false}
      loop={false}
      clickToPlay={false}
      spaceKeyToPlayOrPause={false}
      initiallyMuted={false}
      acknowledgeRemotionLicense
    />
  );
});
