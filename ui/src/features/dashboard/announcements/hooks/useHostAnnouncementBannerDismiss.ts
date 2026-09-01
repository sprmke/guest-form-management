import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  dismissHostAnnouncementBanner,
  pruneDismissedHostAnnouncementBannerKeys,
  readDismissedHostAnnouncementBannerKeys,
} from '@/features/dashboard/announcements/lib/hostAnnouncementBannerDismiss';

export function useHostAnnouncementBannerDismiss(
  orgId: string | null,
  activeIdentityKeys: readonly string[]
) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    pruneDismissedHostAnnouncementBannerKeys(orgId, activeIdentityKeys);
  }, [orgId, activeIdentityKeys]);

  const dismissedKeys = useMemo(
    () => readDismissedHostAnnouncementBannerKeys(orgId),
    [orgId, revision, activeIdentityKeys]
  );

  const dismiss = useCallback(
    (identityKey: string) => {
      if (!orgId) return;
      dismissHostAnnouncementBanner(orgId, identityKey);
      setRevision((current) => current + 1);
    },
    [orgId]
  );

  return { dismissedKeys, dismiss };
}
