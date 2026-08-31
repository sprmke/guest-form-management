import { Sparkles, Ticket } from 'lucide-react';

import { formatVoucherPrizeLabel, type Voucher } from '@/features/guest/sd-form/lib/voucher';

import { formatDateToLongFormat, normalizeDateString } from '@/utils/format/dates';

function formatVoucherStayLine(checkIn: string, checkOut: string): string {
  const inLabel = formatVoucherDateLabel(checkIn);
  const outLabel = formatVoucherDateLabel(checkOut);
  if (inLabel === '—' && outLabel === '—') return '—';
  if (outLabel === '—' || !checkOut.trim()) return inLabel;
  if (inLabel === '—' || !checkIn.trim()) return outLabel;
  return `${inLabel} – ${outLabel}`;
}

function formatVoucherDateLabel(stored: string): string {
  const raw = (stored ?? '').trim();
  if (!raw) return '—';
  const normalized = normalizeDateString(raw);
  const long = formatDateToLongFormat(normalized);
  return long || raw;
}

export function RevealedVoucherCard({
  voucher,
  guestName,
  checkInDate,
  checkOutDate,
}: {
  voucher: Voucher;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
}) {
  const guestDisplay = guestName.trim() || '—';
  const stayLine = formatVoucherStayLine(checkInDate, checkOutDate);

  return (
    <div className="border-primary/40 via-card to-primary/10 shadow-primary/10 relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-emerald-200/10 p-5 shadow-xl">
      <Sparkles
        className="text-primary/70 absolute right-3 top-3 size-6 animate-pulse"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '14px 14px',
        }}
        aria-hidden
      />

      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <span className="bg-primary/15 text-primary inline-flex size-9 items-center justify-center rounded-full">
            <Ticket className="size-5" aria-hidden />
          </span>
          <p className="text-primary text-xs font-bold uppercase tracking-wider">You won</p>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">
            Voucher code
          </p>
          <p className="text-foreground font-mono text-3xl font-extrabold tracking-[0.18em] sm:text-4xl">
            {voucher.code}
          </p>
        </div>

        <div className="divide-primary/15 bg-card/60 ring-primary/20 grid grid-cols-1 divide-y rounded-xl ring-1 backdrop-blur md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="min-w-0 space-y-1 px-4 py-3">
            <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
              Reward
            </p>
            <p className="text-foreground text-sm font-bold tabular-nums">
              {formatVoucherPrizeLabel(voucher)}
            </p>
          </div>
          <div className="min-w-0 space-y-1 px-4 py-3">
            <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
              Guest
            </p>
            <p className="text-foreground break-words text-sm font-semibold leading-snug">
              {guestDisplay}
            </p>
          </div>
          <div className="min-w-0 space-y-1 px-4 py-3">
            <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
              Stay
            </p>
            <p className="text-muted-foreground break-words text-sm leading-snug">{stayLine}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
