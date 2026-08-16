import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import {
  useAiPlatformGlobalSettings,
  useUpdateAiPlatformGlobalSettings,
} from '@/features/dashboard/super-admin/hooks/useAiPlatformGlobalSettings';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

const AI_FEATURES = [
  { id: 'receipt_validation', label: 'Receipt validation' },
  { id: 'inbox_suggest', label: 'Inbox suggestions' },
  { id: 'inbox_auto_reply', label: 'Inbox auto-reply' },
  { id: 'marketing_caption', label: 'Marketing captions' },
  { id: 'marketing_template', label: 'Marketing templates' },
  { id: 'import_column_map', label: 'Import column mapping' },
  { id: 'voice_receptionist', label: 'Voice receptionist' },
  { id: 'booking_ai_summary', label: 'Booking AI review' },
];

export function AiPlatformKillSwitchCard() {
  const { data, isLoading } = useAiPlatformGlobalSettings();
  const update = useUpdateAiPlatformGlobalSettings();

  const allowed = new Set(data?.allowedFeatures ?? []);
  const allEnabled = data?.enabled && allowed.size === 0;

  const save = (patch: {
    enabled?: boolean;
    enforceQuotas?: boolean;
    allowedFeatures?: string[];
    defaultDailyCallLimit?: number;
    defaultMonthlyCallLimit?: number;
    defaultDailyCostUsdLimit?: number;
  }) => {
    update.mutate(patch, {
      onSuccess: () => toast.success('AI platform settings updated'),
      onError: (err: unknown) => toast.error(friendlyToastError(err, 'Could not save setting')),
    });
  };

  const handleEnabledChange = (enabled: boolean) => {
    save({ enabled });
  };

  const handleQuotaChange = (enforceQuotas: boolean) => {
    save({ enforceQuotas });
  };

  const handleFeatureChange = (featureId: string, checked: boolean) => {
    const next = new Set(allowed);
    if (checked) next.add(featureId);
    else next.delete(featureId);
    save({ allowedFeatures: Array.from(next) });
  };

  const handleNumberChange = (
    field: 'defaultDailyCallLimit' | 'defaultMonthlyCallLimit' | 'defaultDailyCostUsdLimit',
    value: string
  ) => {
    const num = field === 'defaultDailyCostUsdLimit' ? parseFloat(value) : parseInt(value, 10);
    if (Number.isFinite(num) && num > 0) {
      save({ [field]: num });
    }
  };

  return (
    <div className="border-border bg-card flex min-h-[88px] flex-col gap-4 rounded-xl border p-4 sm:flex-row">
      <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Sparkles className="text-muted-foreground size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <p className="font-medium">Platform AI</p>
          <p className="text-muted-foreground text-xs">Shared Gemini/Groq features</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex min-h-[44px] items-center gap-2 text-sm">
            <Switch
              checked={Boolean(data?.enabled)}
              disabled={isLoading || update.isPending}
              onCheckedChange={handleEnabledChange}
              aria-label="Enable platform AI"
            />
            Enabled
          </label>
          <label className="flex min-h-[44px] items-center gap-2 text-sm">
            <Switch
              checked={data?.enforceQuotas !== false}
              disabled={isLoading || update.isPending || !data?.enabled}
              onCheckedChange={handleQuotaChange}
              aria-label="Enforce org AI quotas"
            />
            Enforce quotas
          </label>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Allowed features</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AI_FEATURES.map((feature) => {
              const checked = allEnabled || allowed.has(feature.id);
              return (
                <label key={feature.id} className="flex min-h-[44px] items-center gap-2 text-sm">
                  <Switch
                    checked={checked}
                    disabled={isLoading || update.isPending || !data?.enabled}
                    onCheckedChange={(value) => handleFeatureChange(feature.id, value)}
                    aria-label={`Allow ${feature.label}`}
                  />
                  {feature.label}
                </label>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span>Daily calls</span>
            <Input
              type="number"
              min={1}
              value={data?.defaultDailyCallLimit ?? ''}
              disabled={isLoading || update.isPending || !data?.enabled}
              onChange={(e) => handleNumberChange('defaultDailyCallLimit', e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Monthly calls</span>
            <Input
              type="number"
              min={1}
              value={data?.defaultMonthlyCallLimit ?? ''}
              disabled={isLoading || update.isPending || !data?.enabled}
              onChange={(e) => handleNumberChange('defaultMonthlyCallLimit', e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Daily cost USD</span>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={data?.defaultDailyCostUsdLimit ?? ''}
              disabled={isLoading || update.isPending || !data?.enabled}
              onChange={(e) => handleNumberChange('defaultDailyCostUsdLimit', e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
