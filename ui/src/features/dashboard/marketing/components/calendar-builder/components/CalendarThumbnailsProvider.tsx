import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { MarketingCalendarThumbnailHost } from '@/features/dashboard/marketing/components/shared/MarketingCalendarThumbnailHost';
import {
  useMarketingTemplateThumbnails,
  type CalendarThumbnailOptions,
} from '@/features/dashboard/marketing/hooks/useMarketingTemplateThumbnails';

type ThumbnailApi = {
  getThumbnailUrl: (id: string) => string | undefined;
  isThumbnailLoading: (id: string) => boolean;
  requestThumbnail: (id: string) => void;
};

const FALLBACK_THUMBNAIL_API: ThumbnailApi = {
  getThumbnailUrl: () => undefined,
  isThumbnailLoading: () => true,
  requestThumbnail: () => {},
};

const CalendarThumbnailsContext = createContext<ThumbnailApi | null>(null);

export function useCalendarThumbnails(): ThumbnailApi {
  return useContext(CalendarThumbnailsContext) ?? FALLBACK_THUMBNAIL_API;
}

type Props = {
  options: CalendarThumbnailOptions;
  propertyName: string;
  liveCaptureRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

export function CalendarThumbnailsProvider({
  options,
  propertyName,
  liveCaptureRef,
  children,
}: Props) {
  const { getThumbnailUrl, isThumbnailLoading, requestThumbnail } =
    useMarketingTemplateThumbnails(options);

  const requestDefaultThumbnail = useCallback(() => {
    requestThumbnail('default');
    requestThumbnail('preset:default');
  }, [requestThumbnail]);

  const api = useMemo<ThumbnailApi>(
    () => ({
      getThumbnailUrl,
      isThumbnailLoading,
      requestThumbnail,
    }),
    [getThumbnailUrl, isThumbnailLoading, requestThumbnail]
  );

  return (
    <CalendarThumbnailsContext.Provider value={api}>
      <MarketingCalendarThumbnailHost
        propertyName={propertyName}
        liveCaptureRef={liveCaptureRef}
        previewBookings={options.previewBookings ?? []}
        previewMonth={options.previewMonth}
        onMount={requestDefaultThumbnail}
      />
      {children}
    </CalendarThumbnailsContext.Provider>
  );
}
