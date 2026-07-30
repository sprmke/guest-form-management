import { Mic } from 'lucide-react';
import { toast } from 'sonner';

import {
  useUpdateVoiceReceptionistGlobalSettings,
  useVoiceReceptionistGlobalSettings,
} from '@/features/dashboard/super-admin/hooks/useVoiceReceptionistGlobalSettings';

import { Switch } from '@/components/ui/switch';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

export function VoiceReceptionistKillSwitchCard() {
  const { data, isLoading } = useVoiceReceptionistGlobalSettings();
  const update = useUpdateVoiceReceptionistGlobalSettings();

  const handleChange = (enabled: boolean) => {
    update.mutate(enabled, {
      onSuccess: () =>
        toast.success(enabled ? 'Voice receptionist enabled' : 'Voice receptionist disabled'),
      onError: (err: unknown) => toast.error(friendlyToastError(err, 'Could not save setting')),
    });
  };

  return (
    <div className="border-border bg-card flex min-h-[88px] items-center gap-3 rounded-xl border p-4">
      <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Mic className="text-muted-foreground size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">AI Voice Receptionist</p>
        <p className="text-muted-foreground text-xs">Platform-wide kill switch</p>
      </div>
      <Switch
        checked={Boolean(data?.enabled)}
        disabled={isLoading || update.isPending}
        onCheckedChange={handleChange}
        aria-label="Enable AI voice receptionist platform-wide"
      />
    </div>
  );
}
