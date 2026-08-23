import { Suspense, lazy } from 'react';

import type { DesignExportPayload } from '@/features/dashboard/marketing/components/design-editor/PolotnoDesignStudio';

import { MarketingStudioSkeleton } from '@/components/skeletons/AdminSkeletons';

const PolotnoDesignStudio = lazy(() =>
  import('@/features/dashboard/marketing/components/design-editor/PolotnoDesignStudio').then(
    (mod) => ({ default: mod.PolotnoDesignStudio })
  )
);

type Props = {
  onPublish?: (payload: DesignExportPayload) => void;
};

export type { DesignExportPayload };

export function DesignEditor(props: Props) {
  return (
    <Suspense fallback={<MarketingStudioSkeleton />}>
      <PolotnoDesignStudio {...props} />
    </Suspense>
  );
}
