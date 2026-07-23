import type {
  ImportedMarketingMusic,
  JamendoTrack,
} from '@/features/dashboard/marketing/hooks/useMarketingMusic';
import { fetchJamendoStreamAsFile } from '@/features/dashboard/marketing/hooks/useMarketingMusic';
import { VIDEO_MUSIC_DEFAULT_VOLUME } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import type { VideoProjectMusic } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';

export function isJamendoStreamUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return /jamendo\.com/i.test(url);
}

export function videoMusicFromJamendoTrack(
  track: JamendoTrack,
  music: VideoProjectMusic
): VideoProjectMusic {
  return {
    ...music,
    title: track.title,
    artist: track.artist,
    source: 'jamendo',
    trackId: track.id,
    url: track.streamUrl,
    volume: music.volume ?? VIDEO_MUSIC_DEFAULT_VOLUME,
  };
}

export function findJamendoTrackForMusic(
  tracks: JamendoTrack[],
  music: VideoProjectMusic
): JamendoTrack | null {
  if (music.trackId && music.trackId.length > 0) {
    const byId = tracks.find((track) => track.id === music.trackId);
    if (byId) return byId;
  }
  return null;
}

export function applyImportedVideoMusic(
  music: VideoProjectMusic,
  imported: ImportedMarketingMusic
): VideoProjectMusic {
  return {
    ...music,
    url: imported.url,
    title: imported.title ?? music.title,
    artist: imported.artist ?? music.artist,
    source: imported.source,
    trackId: imported.trackId ?? music.trackId,
  };
}

type UploadMarketingMusic = {
  mutateAsync: (input: File | { file: File; fileKey?: string }) => Promise<ImportedMarketingMusic>;
};

/** Client-side Jamendo import (stream fetch + property-media upload). */
export async function importJamendoTrackViaUpload(
  track: JamendoTrack,
  music: VideoProjectMusic,
  uploadMusic: UploadMarketingMusic
): Promise<VideoProjectMusic> {
  const file = await fetchJamendoStreamAsFile(track);
  const imported = await uploadMusic.mutateAsync({
    file,
    fileKey: `jamendo-${track.id}`,
  });

  return {
    ...applyImportedVideoMusic(music, imported),
    title: track.title,
    artist: track.artist,
    source: 'jamendo',
    trackId: track.id,
  };
}
