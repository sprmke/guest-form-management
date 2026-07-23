import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useRef } from 'react';

import {
  useMarketingMusicBrowse,
  useUploadMarketingMusic,
} from '@/features/dashboard/marketing/hooks/useMarketingMusic';
import {
  findJamendoTrackForMusic,
  importJamendoTrackViaUpload,
  isJamendoStreamUrl,
  videoMusicFromJamendoTrack,
} from '@/features/dashboard/marketing/lib/video/importVideoMusic';
import {
  DEFAULT_VIDEO_MUSIC,
  matchDefaultJamendoTrack,
  needsVideoMusicPlayback,
  needsVideoMusicStorageCache,
} from '@/features/dashboard/marketing/lib/video/videoMusicPresets';
import type { VideoProject } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

type SetProject = Dispatch<SetStateAction<VideoProject | null>>;

/**
 * Resolves the default Joystock lofi track for new/legacy templates:
 * 1. Sets Jamendo stream URL immediately so Remotion preview can play.
 * 2. Caches to property-media for stable export URLs.
 */
export function useEnsureDefaultVideoMusic(project: VideoProject | null, setProject: SetProject) {
  const propertyId = usePropertyIdParam();
  const uploadMusic = useUploadMarketingMusic(propertyId);
  const trendingQuery = useMarketingMusicBrowse(propertyId, { order: 'popularity_week' });
  const runningRef = useRef(false);
  const mountedRef = useRef(true);

  const music = project?.music;
  const needsPlayback = needsVideoMusicPlayback(music);
  const needsStorage = needsVideoMusicStorageCache(music);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!project || !propertyId) return;
    if (!needsPlayback && !needsStorage) return;
    if (runningRef.current) return;

    const baseMusic = music ?? DEFAULT_VIDEO_MUSIC;

    void (async () => {
      runningRef.current = true;
      try {
        let tracks = trendingQuery.data?.tracks ?? [];
        if (tracks.length === 0) {
          const refetched = await trendingQuery.refetch();
          tracks = refetched.data?.tracks ?? [];
        }

        const track =
          findJamendoTrackForMusic(tracks, baseMusic) ?? matchDefaultJamendoTrack(tracks);
        if (!track) return;

        let resolvedMusic = baseMusic.url
          ? baseMusic
          : videoMusicFromJamendoTrack(track, baseMusic);

        if (needsPlayback && !baseMusic.url && mountedRef.current) {
          setProject((prev) => {
            if (!prev || prev.music?.url || prev.music?.trackId === '') return prev;
            if (!needsVideoMusicPlayback(prev.music)) return prev;
            return { ...prev, music: resolvedMusic };
          });
        }

        const shouldCache = !resolvedMusic.url || isJamendoStreamUrl(resolvedMusic.url);
        if (!shouldCache) return;

        const cachedMusic = await importJamendoTrackViaUpload(track, resolvedMusic, uploadMusic);
        if (!mountedRef.current || !cachedMusic.url) return;

        setProject((prev) => {
          if (!prev) return prev;
          if (prev.music?.trackId === '') return prev;
          if (prev.music?.url && !isJamendoStreamUrl(prev.music.url)) return prev;
          if (
            prev.music?.trackId &&
            cachedMusic.trackId &&
            prev.music.trackId !== cachedMusic.trackId
          ) {
            return prev;
          }
          return { ...prev, music: cachedMusic };
        });
      } catch {
        // Preview may still work via Jamendo stream URL from step 1.
      } finally {
        runningRef.current = false;
      }
    })();
  }, [
    propertyId,
    needsPlayback,
    needsStorage,
    music?.trackId,
    music?.url,
    music?.title,
    music?.artist,
    music?.source,
    setProject,
    uploadMusic,
    trendingQuery.data?.tracks,
    trendingQuery.refetch,
  ]);
}
