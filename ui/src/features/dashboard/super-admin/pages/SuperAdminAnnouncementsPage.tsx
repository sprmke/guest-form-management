import { useEffect, useMemo, useState } from 'react';

import { Landmark, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { HostAnnouncementEditor } from '@/features/dashboard/announcements/components/HostAnnouncementEditor';
import {
  parseHostAnnouncementDrafts,
  validateHostAnnouncements,
  type HostAnnouncementDraft,
} from '@/features/dashboard/announcements/lib/hostAnnouncementTypes';
import { SuperAdminPageLoading } from '@/features/dashboard/super-admin/components/shared/SuperAdminPageLoading';
import {
  usePlatformHostSettings,
  useUpdatePlatformHostSettings,
} from '@/features/dashboard/super-admin/hooks/usePlatformHostSettings';
import { superAdminPaths } from '@/features/dashboard/super-admin/lib/superAdminPaths';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { appPageTitle, usePageTitle } from '@/lib/pageTitle';

export function SuperAdminAnnouncementsPage() {
  usePageTitle(appPageTitle('Announcements'));

  const { data, isLoading } = usePlatformHostSettings();
  const updateSettings = useUpdatePlatformHostSettings();
  const [baseline, setBaseline] = useState<HostAnnouncementDraft[]>([]);
  const [draft, setDraft] = useState<HostAnnouncementDraft[]>([]);

  useEffect(() => {
    if (!data) return;
    const next = parseHostAnnouncementDrafts(data.announcements);
    setBaseline(next);
    setDraft(next);
  }, [data?.updatedAt]);

  const isDirty = useMemo(
    () => JSON.stringify(baseline) !== JSON.stringify(draft),
    [baseline, draft]
  );

  const handleSave = async () => {
    const validationError = validateHostAnnouncements(draft);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      const result = await updateSettings.mutateAsync({ announcements: draft });
      const saved = parseHostAnnouncementDrafts(result.announcements);
      setBaseline(saved);
      setDraft(saved);
      toast.success('Platform announcements saved');
    } catch (err) {
      toast.error(friendlyToastError(err, 'Could not save announcements'));
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <AdminPageHeader
        title="Announcements"
        actions={
          <Button
            type="button"
            size="sm"
            className="min-h-[44px] gap-1.5"
            disabled={!isDirty || updateSettings.isPending || isLoading}
            onClick={() => void handleSave()}
          >
            <Save className="size-4" aria-hidden />
            {updateSettings.isPending ? 'Saving…' : 'Save'}
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <SuperAdminPageLoading />
          ) : (
            <HostAnnouncementEditor
              announcements={draft}
              disabled={updateSettings.isPending}
              onChange={setDraft}
              trailingActions={
                <Button type="button" variant="outline" className="min-h-[44px] gap-1.5" asChild>
                  <Link to={superAdminPaths.developments}>
                    <Landmark className="size-4" aria-hidden />
                    Development announcements
                  </Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
