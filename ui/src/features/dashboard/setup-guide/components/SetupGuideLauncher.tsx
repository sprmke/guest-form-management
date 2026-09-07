import { ListChecks } from 'lucide-react';

import { useOptionalSetupGuide } from '@/features/dashboard/setup-guide/components/SetupGuideProvider';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/** Dashboard card that re-opens the Setup Guide while required steps remain. */
export function SetupGuideLauncher() {
  const guide = useOptionalSetupGuide();
  if (!guide?.org) return null;
  if (guide.requiredRemaining <= 0) return null;
  if (guide.persisted.completedAt) return null;

  return (
    <Card className="border-primary/20 bg-primary/[0.04]">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <ListChecks className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-foreground font-medium">Finish setup</p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {guide.progress.requiredComplete} of {guide.progress.requiredTotal} required ·{' '}
              {guide.requiredRemaining} left
            </p>
          </div>
        </div>
        <Button type="button" className="min-h-11 shrink-0" onClick={() => guide.openGuide()}>
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
