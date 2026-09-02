import { BellRing, Smartphone } from 'lucide-react';

import { usePushNotifications } from '@/features/dashboard/notifications/hooks/usePushNotifications';

import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/**
 * Per-device OS push opt-in. Web Push works on desktop Chrome/Edge/Firefox and
 * Android; on iOS/iPadOS it needs the app installed to the Home Screen first
 * (`needsInstallFirst`).
 */
export function PushNotificationsCard() {
  const { supported, needsInstallFirst, permission, subscribed, busy, enable, disable } =
    usePushNotifications();

  const blocked = permission === 'denied';

  let status: string;
  if (needsInstallFirst) {
    status = 'Add this app to your Home Screen, then turn on notifications from the installed app.';
  } else if (!supported) {
    status = 'This browser doesn’t support push notifications.';
  } else if (blocked) {
    status = 'Notifications are blocked. Enable them for this site in your browser settings.';
  } else if (subscribed) {
    status = 'This device will receive notifications even when the app is closed.';
  } else {
    status = 'Get booking, message, and workflow alerts on this device when the app is closed.';
  }

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="bg-primary/10 text-primary mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            {needsInstallFirst ? (
              <Smartphone className="h-4.5 w-4.5" />
            ) : (
              <BellRing className="h-4.5 w-4.5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-foreground text-sm font-semibold">Notifications on this device</p>
            <p className={cn('text-muted-foreground mt-0.5 text-xs leading-snug')}>{status}</p>
          </div>
        </div>
        <Switch
          aria-label="Notifications on this device"
          checked={subscribed}
          disabled={busy || !supported || needsInstallFirst || blocked}
          onCheckedChange={(next) => {
            if (next) void enable();
            else void disable();
          }}
        />
      </div>
    </div>
  );
}
