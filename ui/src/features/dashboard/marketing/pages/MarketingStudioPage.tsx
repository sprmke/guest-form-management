import { useState } from 'react';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { MarketingCalendarSection } from '@/features/dashboard/marketing/components/calendar-builder/MarketingCalendarSection';
import { DesignEditor } from '@/features/dashboard/marketing/components/design-editor/DesignEditor';
import type { DesignExportPayload } from '@/features/dashboard/marketing/components/design-editor/DesignEditor';
import {
  PublishDialog,
  type PublishMedia,
} from '@/features/dashboard/marketing/components/publishing/PublishDialog';
import { PublishHistory } from '@/features/dashboard/marketing/components/publishing/PublishHistory';
import { MarketingStudioHeaderActionsProvider } from '@/features/dashboard/marketing/components/shared/marketingStudioHeaderActions';
import { MarketingStudioModeTabs } from '@/features/dashboard/marketing/components/shared/MarketingStudioModeTabs';
import { SlidingTabs } from '@/features/dashboard/marketing/components/shared/MarketingStudioModeTabs';
import { MarketingStudioShell } from '@/features/dashboard/marketing/components/shared/MarketingStudioShell';
import { VideoEditor } from '@/features/dashboard/marketing/components/video-editor/VideoEditor';
import type { VideoExportPayload } from '@/features/dashboard/marketing/components/video-editor/VideoEditor';

import { SlidingTabsContent } from '@/components/ui/sliding-tabs';

export function MarketingStudioPage() {
  const [tab, setTab] = useState('calendar');
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMedia, setPublishMedia] = useState<PublishMedia | null>(null);

  const openPublishWithBlob = (blob: Blob, mediaType: 'image' | 'video', templateId?: string) => {
    setPublishMedia({ blob, mediaType, templateId });
    setPublishOpen(true);
  };

  const handleCalendarPublish = (blob: Blob) => {
    openPublishWithBlob(blob, 'image', 'calendar');
  };

  const handleDesignPublish = (payload: DesignExportPayload) => {
    openPublishWithBlob(payload.blob, 'image', payload.templateId);
  };

  const handleVideoPublish = (payload: VideoExportPayload) => {
    openPublishWithBlob(payload.blob, 'video', payload.templateId);
  };

  return (
    <>
      <SlidingTabs value={tab} onValueChange={setTab}>
        <MarketingStudioHeaderActionsProvider>
          <AdminMobilePage
            title="Marketing"
            subtitle="Build calendars, designs, and promo videos."
            titleId="marketing-heading"
          >
            <MarketingStudioShell tabs={<MarketingStudioModeTabs />}>
              <SlidingTabsContent value="calendar" className="mt-0 flex min-h-0 flex-1 flex-col">
                <MarketingCalendarSection onPublish={handleCalendarPublish} />
              </SlidingTabsContent>

              <SlidingTabsContent value="design" className="mt-0 flex min-h-0 flex-1 flex-col">
                <DesignEditor onPublish={handleDesignPublish} />
              </SlidingTabsContent>

              <SlidingTabsContent value="video" className="mt-0 flex min-h-0 flex-1 flex-col">
                <VideoEditor onPublish={handleVideoPublish} />
              </SlidingTabsContent>
            </MarketingStudioShell>

            <PublishHistory />
          </AdminMobilePage>
        </MarketingStudioHeaderActionsProvider>
      </SlidingTabs>

      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} media={publishMedia} />
    </>
  );
}
