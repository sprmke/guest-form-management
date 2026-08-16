import type { ChatBlock } from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';

type Props = Extract<ChatBlock, { type: 'booking_card' }>;

export function BookingCardBlock({
  guestName,
  status,
  checkIn,
  checkOut,
  propertyName,
  balanceDue,
}: Props) {
  return (
    <div className="border-border/60 bg-card space-y-2 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground truncate text-sm font-semibold">{guestName || 'Guest'}</p>
        <StatusBadge status={status} />
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span>{propertyName}</span>
        <span>
          {checkIn} → {checkOut}
        </span>
        {balanceDue != null && (
          <span className={balanceDue > 0 ? 'text-destructive font-medium' : undefined}>
            Balance: ₱{balanceDue.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
