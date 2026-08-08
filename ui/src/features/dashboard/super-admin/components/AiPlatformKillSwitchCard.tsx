import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import {
  useAiPlatformGlobalSettings,
  useUpdateAiPlatformGlobalSettings,
} from '@/features/dashboard/super-admin/hooks/useAiPlatformGlobalSettings';

import { Switch } from '@/components/ui/switch';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

export function AiPlatformKillSwitchCard() {
  const { data, isLoading } = useAiPlatformGlobalSettings();
  const update = useUpdateAiPlatformGlobalSettings();

  const handleEnabledChange = (enabled: boolean) => {
    update.mutate(
      { enabled },
      {
        onSuccess: () => toast.success(enabled ? 'Platform AI enabled' : 'Platform AI disabled'),
        onError: (err: unknown) => toast.error(friendlyToastError(err, 'Could not save setting')),
      }
    );
  };

  const handleQuotaChange = (enforceQuotas: boolean) => {
    update.mutate(
      { enforceQuotas },
      {
        onSuccess: () => toast.success('AI quota enforcement updated'),
        onError: (err: unknown) => toast.error(friendlyToastError(err, 'Could not save setting')),
      }
    );
  };

  return (
    <div className="border-border bg-card flex min-h-[88px] flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
      <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Sparkles className="text-muted-foreground size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
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
      </div>
    </div>
  );
}
