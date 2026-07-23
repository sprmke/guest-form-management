import { Suspense, lazy } from 'react';

import { Loader2 } from 'lucide-react';

import type { DesignExportPayload } from '@/features/dashboard/marketing/components/design-editor/PolotnoDesignStudio';

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
    <Suspense
      fallback={
        <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      }
    >
      <PolotnoDesignStudio {...props} />
    </Suspense>
  );
}
