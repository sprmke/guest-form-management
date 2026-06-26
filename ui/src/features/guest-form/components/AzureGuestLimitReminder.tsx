import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AZURE_ADULT_LIMIT_MESSAGE } from '@/features/guest-form/lib/guestCounts';

const MESSAGE_PARAGRAPHS = AZURE_ADULT_LIMIT_MESSAGE.split('\n\n').filter(
  Boolean,
);

type AzureGuestLimitReminderProps = {
  className?: string;
};

export function AzureGuestLimitReminder({
  className,
}: AzureGuestLimitReminderProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex gap-3 rounded-xl border border-amber-500/35 bg-amber-500/[0.07] p-4 sm:gap-4',
        'dark:border-amber-500/25 dark:bg-amber-500/10',
        className,
      )}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400"
        aria-hidden
      >
        <Info className="size-4" />
      </div>
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-semibold leading-snug text-foreground">
          Azure Maximum Guests Reminder
        </p>
        {MESSAGE_PARAGRAPHS.map((paragraph) => (
          <p
            key={paragraph}
            className="text-sm leading-relaxed text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
