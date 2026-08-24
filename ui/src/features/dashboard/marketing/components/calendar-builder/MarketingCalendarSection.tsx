import { useMemo, useRef } from 'react';

import { CalendarBuilder } from '@/features/dashboard/marketing/components/calendar-builder/components/CalendarBuilder';
import { useCalendarExport } from '@/features/dashboard/marketing/components/calendar-builder/hooks/useCalendarExport';
import { useCalendarBuilderStore } from '@/features/dashboard/marketing/components/calendar-builder/stores/calendarBuilderStore';
import { useMarketingBookedDates } from '@/features/dashboard/marketing/hooks/useMarketingBookedDates';
import { bookedDatesToPreviewBookings } from '@/features/dashboard/marketing/lib/marketingBookedDates';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useUpgradeModal } from '@/features/dashboard/plans/components/UpgradeModalProvider';
import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';

import { BookingsCalendarSkeleton } from '@/components/skeletons/AdminSkeletons';

type Props = {
  onPublish?: (blob: Blob) => void;
};

export function MarketingCalendarSection({ onPublish }: Props) {
  const { property } = useOrgContext();
  const previewRef = useRef<HTMLDivElement>(null);
  const previewMonth = useCalendarBuilderStore((s) => s.previewMonth);
  const { data: bookedDates, isLoading } = useMarketingBookedDates();
  const { canUse: canUseMarketingStudio, isLoading: marketingStudioLoading } =
    useFeatureGate('marketingStudio');
  const { open: openUpgradeModal } = useUpgradeModal();

  const bookings = useMemo(
    () => bookedDatesToPreviewBookings(bookedDates ?? [], previewMonth),
    [bookedDates, previewMonth]
  );

  const {
    handleDownload: handleDownloadFromHook,
    handleExportBlob,
    isExporting,
  } = useCalendarExport(previewRef, property.name);

  const handleDownload = async () => {
    if (!canUseMarketingStudio) {
      if (!marketingStudioLoading) openUpgradeModal('marketingStudio');
      return;
    }
    await handleDownloadFromHook();
  };

  const handlePublish = async () => {
    if (!canUseMarketingStudio) {
      if (!marketingStudioLoading) openUpgradeModal('marketingStudio');
      return;
    }
    if (!onPublish) return;
    const blob = await handleExportBlob();
    if (blob) onPublish(blob);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {isLoading && (
        <div className="bg-background/60 absolute inset-0 z-10 overflow-hidden rounded-xl">
          <BookingsCalendarSkeleton gridOnly compact />
        </div>
      )}
      <CalendarBuilder
        propertyName={property.name}
        propertySlug={property.slug}
        bookings={bookings}
        exportContainerRef={previewRef}
        onExport={() => void handleDownload()}
        onPublish={onPublish ? () => void handlePublish() : undefined}
        isExporting={isExporting}
      />
    </div>
  );
}
