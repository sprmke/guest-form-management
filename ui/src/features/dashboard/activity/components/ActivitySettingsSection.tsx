import { useEffect, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import {
  ACTIVITY_LOG_SUBTITLE,
  ActivityLogPanel,
  type ActivityLogScope,
} from '@/features/dashboard/activity/components/ActivityLogPanel';

import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

const ACTIVITY_SETTINGS_SUMMARY: Record<ActivityLogScope, string> = {
  org: 'Who did what across your organization.',
  property: 'Who did what on this property.',
  parking: 'Who did what on this parking listing.',
};

const OPEN_ACTIVITY_QUERY = 'activity';

type Props = {
  scope: ActivityLogScope;
};

export function ActivitySettingsSection({ scope }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('open') !== OPEN_ACTIVITY_QUERY) return;
    setManageOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const summary = ACTIVITY_SETTINGS_SUMMARY[scope];
  const subtitle = ACTIVITY_LOG_SUBTITLE[scope];

  return (
    <>
      <div className="bg-muted/40 flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3">
        <p className="text-card-description min-w-0 flex-1">{summary}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="settings-action shrink-0"
          onClick={() => setManageOpen(true)}
        >
          Manage
        </Button>
      </div>

      <ResponsiveModal open={manageOpen} onOpenChange={setManageOpen}>
        <ResponsiveModalContent
          sheetLayout="split"
          className={cn(
            'flex max-h-[min(92dvh,52rem)] w-[min(calc(100vw-1.5rem),48rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(95vw,48rem)] sm:p-0'
          )}
        >
          <ResponsiveModalHeader className="border-border/60 shrink-0 space-y-1 border-b px-4 py-3 text-left sm:px-5 sm:py-4">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="min-w-0">
                <ResponsiveModalTitle className="text-base sm:text-lg">
                  Activity
                </ResponsiveModalTitle>
                <ResponsiveModalDescription>{subtitle}</ResponsiveModalDescription>
              </div>
            </div>
          </ResponsiveModalHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4">
            <ActivityLogPanel scope={scope} />
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}
