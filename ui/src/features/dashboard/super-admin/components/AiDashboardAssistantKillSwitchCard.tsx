import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import {
  useAiDashboardAssistantGlobalSettings,
  useUpdateAiDashboardAssistantGlobalSettings,
} from '@/features/dashboard/ai-assistant/hooks/useAiDashboardAssistantSettings';

import { Switch } from '@/components/ui/switch';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

export function AiDashboardAssistantKillSwitchCard() {
  const { data, isLoading } = useAiDashboardAssistantGlobalSettings();
  const update = useUpdateAiDashboardAssistantGlobalSettings();

  const handleEnabledChange = (enabled: boolean) => {
    update.mutate(
      { enabled },
      {
        onSuccess: () => toast.success('AI dashboard assistant settings updated'),
        onError: (err: unknown) => toast.error(friendlyToastError(err, 'Could not save setting')),
      }
    );
  };

  return (
    <div className="border-border bg-card flex min-h-[88px] flex-col gap-4 rounded-xl border p-4 sm:flex-row">
      <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Sparkles className="text-muted-foreground size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <p className="font-medium">AI dashboard assistant</p>
          <p className="text-muted-foreground text-xs">Chat assistant in the admin dashboard</p>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <Switch
            checked={Boolean(data?.enabled)}
            disabled={isLoading || update.isPending}
            onCheckedChange={handleEnabledChange}
            aria-label="Enable AI dashboard assistant platform-wide"
          />
          Enabled
        </label>
      </div>
    </div>
  );
}
