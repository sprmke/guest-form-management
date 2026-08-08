import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import {
  useAiPlatformSettings,
  useAiPlatformUsage,
  useUpdateAiPlatformSettings,
} from '@/features/dashboard/org/hooks/useAiPlatformSettings';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

type Draft = {
  enabled: boolean;
  dailyCallLimit: string;
  monthlyCallLimit: string;
};

export function OrgAiPlatformSection() {
  const { data: settings, isLoading: settingsLoading } = useAiPlatformSettings();
  const { data: usage, isLoading: usageLoading } = useAiPlatformUsage();
  const update = useUpdateAiPlatformSettings();

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [baseline, setBaseline] = React.useState<Draft | null>(null);

  React.useEffect(() => {
    if (!settings) return;
    const next: Draft = {
      enabled: settings.enabled,
      dailyCallLimit: String(settings.dailyCallLimit),
      monthlyCallLimit: String(settings.monthlyCallLimit),
    };
    setDraft((current) => (current === null ? next : current));
    setBaseline((current) => (current === null ? next : current));
  }, [settings]);

  const dirty =
    draft && baseline
      ? draft.enabled !== baseline.enabled ||
        draft.dailyCallLimit !== baseline.dailyCallLimit ||
        draft.monthlyCallLimit !== baseline.monthlyCallLimit
      : false;

  const handleSave = () => {
    if (!draft) return;
    const dailyCallLimit = Number(draft.dailyCallLimit);
    const monthlyCallLimit = Number(draft.monthlyCallLimit);
    if (!Number.isFinite(dailyCallLimit) || dailyCallLimit <= 0) {
      toast.error('Daily limit must be a positive number');
      return;
    }
    if (!Number.isFinite(monthlyCallLimit) || monthlyCallLimit <= 0) {
      toast.error('Monthly limit must be a positive number');
      return;
    }

    update.mutate(
      {
        enabled: draft.enabled,
        dailyCallLimit,
        monthlyCallLimit,
      },
      {
        onSuccess: (saved) => {
          const next: Draft = {
            enabled: saved.enabled,
            dailyCallLimit: String(saved.dailyCallLimit),
            monthlyCallLimit: String(saved.monthlyCallLimit),
          };
          setDraft(next);
          setBaseline(next);
          toast.success('AI limits saved');
        },
        onError: (err: unknown) => toast.error(friendlyToastError(err, 'Could not save AI limits')),
      }
    );
  };

  if (settingsLoading || usageLoading || !draft) {
    return (
      <section id="section-ai" className="scroll-mt-24">
        <div className="flex justify-center py-8">
          <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
        </div>
      </section>
    );
  }

  const showUpgradeStub = usage?.quotaExceeded || usage?.planTier === 'included';

  return (
    <section id="section-ai" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">AI usage</h2>
      </div>

      {usage ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Today</dt>
            <dd>
              {usage.todayCallCount} / {usage.dailyCallLimit} calls
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">This month</dt>
            <dd>
              {usage.monthCallCount} / {usage.monthlyCallLimit} calls
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Est. cost (month)</dt>
            <dd>${usage.monthEstimatedCostUsd.toFixed(4)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="capitalize">{usage.planTier.replace('_', ' ')}</dd>
          </div>
        </dl>
      ) : null}

      {showUpgradeStub ? (
        <p className="text-muted-foreground text-sm">
          Need more AI capacity? Upgrade for higher limits — billing integration coming soon.
        </p>
      ) : null}

      <div className="space-y-3">
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <Switch
            checked={draft.enabled}
            onCheckedChange={(enabled) =>
              setDraft((current) => (current ? { ...current, enabled } : current))
            }
            aria-label="Enable AI for organization"
          />
          AI enabled
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Daily call limit</span>
            <Input
              inputMode="numeric"
              value={draft.dailyCallLimit}
              onChange={(e) =>
                setDraft((current) =>
                  current ? { ...current, dailyCallLimit: e.target.value } : current
                )
              }
              aria-label="Daily AI call limit"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Monthly call limit</span>
            <Input
              inputMode="numeric"
              value={draft.monthlyCallLimit}
              onChange={(e) =>
                setDraft((current) =>
                  current ? { ...current, monthlyCallLimit: e.target.value } : current
                )
              }
              aria-label="Monthly AI call limit"
            />
          </label>
        </div>
      </div>

      {dirty ? (
        <Button
          type="button"
          className="min-h-[44px]"
          disabled={update.isPending}
          onClick={handleSave}
        >
          {update.isPending ? 'Saving…' : 'Save AI limits'}
        </Button>
      ) : null}
    </section>
  );
}
