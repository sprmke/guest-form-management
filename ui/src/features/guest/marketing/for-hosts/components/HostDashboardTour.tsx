import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Player, type PlayerRef } from '@remotion/player';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

import { HostDashboardFilm } from '@/features/guest/marketing/for-hosts/components/HostDashboardFilm';
import {
  HOST_TOUR_CHAPTER_FRAMES,
  HOST_TOUR_DURATION_IN_FRAMES,
  HOST_TOUR_FPS,
  hostTourChapters,
} from '@/features/guest/marketing/for-hosts/data/hostTourChapters';

import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

function formatTourTime(frame: number) {
  const seconds = Math.floor(frame / HOST_TOUR_FPS);
  return `0:${String(seconds).padStart(2, '0')}`;
}

export function HostDashboardTour() {
  const playerRef = useRef<PlayerRef>(null);
  const resumeAfterInteractionRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [currentFrame, setCurrentFrame] = useState(
    prefersReducedMotion ? HOST_TOUR_CHAPTER_FRAMES - 1 : 0
  );
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion);
  const [narrationMuted, setNarrationMuted] = useState(true);
  const filmProps = useMemo(() => ({ narrationMuted }), [narrationMuted]);

  const activeChapterIndex = Math.min(
    hostTourChapters.length - 1,
    Math.floor(currentFrame / HOST_TOUR_CHAPTER_FRAMES)
  );
  const activeChapter = hostTourChapters[activeChapterIndex];

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const syncFrame = () => setCurrentFrame(player.getCurrentFrame());
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    syncFrame();
    player.addEventListener('frameupdate', syncFrame);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);

    return () => {
      player.removeEventListener('frameupdate', syncFrame);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.pause();
    };
  }, [prefersReducedMotion]);

  const seekToChapter = useCallback(
    (index: number) => {
      const player = playerRef.current;
      if (!player) return;
      const target = index * HOST_TOUR_CHAPTER_FRAMES + (prefersReducedMotion ? 70 : 0);
      player.seekTo(target);
      setCurrentFrame(target);
      if (!prefersReducedMotion) void player.play();
    },
    [prefersReducedMotion]
  );

  const togglePlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    resumeAfterInteractionRef.current = false;
    if (isPlaying) {
      player.pause();
      return;
    }
    void player.play();
  }, [isPlaying]);

  const toggleNarration = useCallback(() => {
    setNarrationMuted((muted) => !muted);
  }, []);

  const restart = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(0);
    setCurrentFrame(0);
    if (!prefersReducedMotion) void player.play();
  }, [prefersReducedMotion]);

  const pauseForInteraction = useCallback(() => {
    const player = playerRef.current;
    if (!player || !player.isPlaying()) return;
    resumeAfterInteractionRef.current = true;
    player.pause();
  }, []);

  const resumeAfterInteraction = useCallback(() => {
    if (prefersReducedMotion || !resumeAfterInteractionRef.current) return;
    resumeAfterInteractionRef.current = false;
    void playerRef.current?.play();
  }, [prefersReducedMotion]);

  const chapterProgress = useMemo(() => {
    const chapterFrame = currentFrame % HOST_TOUR_CHAPTER_FRAMES;
    return Math.min(100, (chapterFrame / HOST_TOUR_CHAPTER_FRAMES) * 100);
  }, [currentFrame]);

  return (
    <div id="features" className="scroll-mt-24 pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-9 max-w-3xl text-center sm:mb-12">
          <p className="text-primary mb-3 text-xs font-bold uppercase tracking-[0.2em]">
            One workspace, every moving part
          </p>
          <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Watch a booking become a business
          </h2>
        </div>

        <div
          role="region"
          aria-label="Interactive Kame Homes dashboard tour"
          className="border-border bg-card shadow-primary/10 mx-auto max-w-7xl rounded-[1.4rem] border p-2 shadow-2xl sm:rounded-[2rem] sm:p-3"
          onMouseEnter={pauseForInteraction}
          onMouseLeave={resumeAfterInteraction}
          onFocusCapture={pauseForInteraction}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              resumeAfterInteraction();
            }
          }}
        >
          <div className="relative overflow-hidden rounded-[1rem] bg-slate-950 sm:rounded-[1.4rem]">
            <Player
              key={prefersReducedMotion ? 'reduced' : 'animated'}
              ref={playerRef}
              component={HostDashboardFilm}
              inputProps={filmProps}
              durationInFrames={HOST_TOUR_DURATION_IN_FRAMES}
              compositionWidth={1280}
              compositionHeight={720}
              fps={HOST_TOUR_FPS}
              autoPlay={!prefersReducedMotion}
              initialFrame={prefersReducedMotion ? HOST_TOUR_CHAPTER_FRAMES - 1 : 0}
              loop={!prefersReducedMotion}
              controls={false}
              clickToPlay={false}
              spaceKeyToPlayOrPause={false}
              acknowledgeRemotionLicense
              style={{ width: '100%', aspectRatio: '16 / 9', display: 'block' }}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
          </div>

          <div className="px-1 pb-1 pt-3 sm:px-2 sm:pb-2 sm:pt-4">
            <div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-h-[44px] min-w-[44px] rounded-full"
                onClick={togglePlayback}
                aria-label={isPlaying ? 'Pause dashboard tour' : 'Play dashboard tour'}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" aria-hidden />
                ) : (
                  <Play className="h-4 w-4" aria-hidden />
                )}
              </Button>
              <Button
                type="button"
                variant={narrationMuted ? 'default' : 'outline'}
                size="icon"
                className="min-h-[44px] min-w-[44px] rounded-full"
                onClick={toggleNarration}
                aria-label={narrationMuted ? 'Unmute narration' : 'Mute narration'}
                aria-pressed={!narrationMuted}
              >
                {narrationMuted ? (
                  <VolumeX className="h-4 w-4" aria-hidden />
                ) : (
                  <Volume2 className="h-4 w-4" aria-hidden />
                )}
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-bold sm:text-base">
                  {activeChapter?.title}
                </p>
                <p className="text-muted-foreground hidden truncate text-xs sm:block">
                  {activeChapter?.description}
                </p>
              </div>
              <span className="text-muted-foreground hidden text-xs tabular-nums sm:block">
                {formatTourTime(currentFrame)} / 0:54
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px] rounded-full"
                onClick={restart}
                aria-label="Restart dashboard tour"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <div
              className="scrollbar-hide flex snap-x gap-2 overflow-x-auto pb-1"
              aria-label="Dashboard tour chapters"
            >
              {hostTourChapters.map((chapter, index) => {
                const active = index === activeChapterIndex;
                const complete = index < activeChapterIndex;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => seekToChapter(index)}
                    aria-current={active ? 'step' : undefined}
                    className={cn(
                      'focus-visible:ring-ring relative min-h-[48px] min-w-[132px] snap-start overflow-hidden rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-w-0 sm:flex-1',
                      active
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <chapter.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{chapter.label}</span>
                    </span>
                    <span className="bg-muted absolute inset-x-2 bottom-1 h-0.5 overflow-hidden rounded-full">
                      <span
                        className="bg-primary block h-full rounded-full"
                        style={{
                          width: complete ? '100%' : active ? `${chapterProgress}%` : '0%',
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="sr-only" aria-live="polite">
              Showing {activeChapter?.label}: {activeChapter?.title}. {activeChapter?.narration}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
