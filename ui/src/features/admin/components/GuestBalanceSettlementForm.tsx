/**
 * GuestBalanceSettlementForm — Shown when advancing READY_FOR_CHECKIN →
 * READY_FOR_CHECKOUT. Requires **balance amount paid** to **equal** total
 * guest balance (same formula as pricing: rate − down + SD + pet + parking guest
 * + additional). Payment balance receipt is required only when total > ₱0
 * (free stays may proceed with paid = 0 and no receipt; sd-refund-cron uses the
 * same rules server-side).
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { BOOKING_QUERY_KEY } from '@/features/admin/hooks/useBooking';
import { ExternalLink, FileImage, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/features/admin/lib/formatters';
import type { BookingRow } from '@/features/admin/lib/types';
import {
  computeTotalGuestBalance,
  guestBalancePaymentReceiptRequired,
} from '@/features/admin/lib/totalGuestBalance';
import { resolveAssetUrlForBrowser } from '@/features/admin/lib/storageUrls';
import { useUploadBookingAsset } from '@/features/admin/hooks/useUploadBookingAsset';
import { WorkflowSubFormCard } from '@/features/admin/components/WorkflowSubFormCard';
import { cn } from '@/lib/utils';

export type GuestBalanceSettlementValues = {
  guest_balance_paid_amount: number;
  /** Empty when total guest balance is ₱0 and no receipt was uploaded. */
  guest_balance_payment_receipt_url: string;
};

type Props = {
  booking: BookingRow;
  initialDraft?: GuestBalanceSettlementValues | null;
  onChange: (values: GuestBalanceSettlementValues | null) => void;
};

function defaultPaidFromBooking(booking: BookingRow): number {
  const bal = computeTotalGuestBalance(booking);
  if (bal === null) return 0;
  const saved = booking.guest_balance_paid_amount;
  if (saved !== null && saved !== undefined && saved !== '') {
    const p = typeof saved === 'string' ? Number(saved) : saved;
    if (!Number.isNaN(p) && p >= 0) return Math.round(p * 100) / 100;
  }
  return Math.round(bal * 100) / 100;
}

function parsePaidInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function GuestBalanceSettlementForm({
  booking,
  initialDraft = null,
  onChange,
}: Props) {
  const qc = useQueryClient();
  const uploadMut = useUploadBookingAsset();
  const fileRef = useRef<HTMLInputElement>(null);

  const savePaidMut = useMutation({
    mutationFn: async (paid: number) => {
      const { error } = await supabase
        .from('guest_submissions')
        .update({
          guest_balance_paid_amount: paid,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(booking.id) });
    },
  });

  const totalDue = computeTotalGuestBalance(booking);
  const receiptRequired =
    totalDue !== null && guestBalancePaymentReceiptRequired(totalDue);
  const [paidInput, setPaidInput] = useState(() => {
    if (initialDraft) return String(initialDraft.guest_balance_paid_amount);
    const b = computeTotalGuestBalance(booking);
    if (b === null) return '';
    return String(defaultPaidFromBooking(booking));
  });
  const [receiptUrl, setReceiptUrl] = useState(
    () =>
      initialDraft?.guest_balance_payment_receipt_url?.trim() ??
      booking.guest_balance_payment_receipt_url?.trim() ??
      '',
  );
  const [receiptImgSrc, setReceiptImgSrc] = useState<string | null>(null);
  const [receiptImgFailed, setReceiptImgFailed] = useState(false);

  useEffect(() => {
    if (!receiptUrl.trim()) {
      setReceiptImgSrc(null);
      setReceiptImgFailed(false);
      return;
    }
    let cancelled = false;
    setReceiptImgSrc(null);
    setReceiptImgFailed(false);
    resolveAssetUrlForBrowser(receiptUrl)
      .then((u) => {
        if (!cancelled) setReceiptImgSrc(u);
      })
      .catch(() => {
        if (!cancelled) setReceiptImgSrc(receiptUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [receiptUrl]);

  useEffect(() => {
    const fromBooking = booking.guest_balance_payment_receipt_url?.trim() ?? '';
    if (fromBooking && !initialDraft) setReceiptUrl(fromBooking);
  }, [booking.guest_balance_payment_receipt_url, initialDraft]);

  // Persist paid amount on RFCI so sd-refund-cron can auto-advance status once settlement matches total.
  useEffect(() => {
    if (booking.status !== 'READY_FOR_CHECKIN') return;
    const paidParsed = parsePaidInput(paidInput);
    if (paidParsed === null || paidParsed < 0 || totalDue === null) return;
    const paidCents = Math.round(paidParsed * 100);
    const balCents = Math.round(totalDue * 100);
    if (paidCents > balCents) return;

    const prev = booking.guest_balance_paid_amount;
    const prevNum =
      prev === null || prev === undefined || prev === '' ? NaN : Number(prev);
    if (!Number.isNaN(prevNum) && Math.round(prevNum * 100) === paidCents)
      return;

    const t = setTimeout(() => {
      savePaidMut.mutate(paidCents / 100);
    }, 600);
    return () => clearTimeout(t);
  }, [
    paidInput,
    totalDue,
    booking.id,
    booking.status,
    booking.guest_balance_paid_amount,
  ]);

  useEffect(() => {
    if (totalDue === null) {
      onChange(null);
      return;
    }

    const balCents = Math.round(totalDue * 100);
    let paidParsed = parsePaidInput(paidInput);
    if (paidParsed === null) {
      if (balCents === 0) paidParsed = 0;
      else {
        onChange(null);
        return;
      }
    }
    if (paidParsed < 0) {
      onChange(null);
      return;
    }

    const paidCents = Math.round(paidParsed * 100);
    if (paidCents > balCents) {
      onChange(null);
      return;
    }
    if (paidCents !== balCents) {
      onChange(null);
      return;
    }

    const receipt = receiptUrl.trim();
    if (receiptRequired && !receipt) {
      onChange(null);
      return;
    }

    onChange({
      guest_balance_paid_amount: Math.round(paidParsed * 100) / 100,
      guest_balance_payment_receipt_url: receipt,
    });
  }, [totalDue, paidInput, receiptUrl, receiptRequired, onChange]);

  const paidUi = parsePaidInput(paidInput) ?? NaN;
  const paidCentsUi =
    totalDue !== null && !Number.isNaN(paidUi)
      ? Math.round(paidUi * 100)
      : null;
  const balCentsUi = totalDue !== null ? Math.round(totalDue * 100) : null;
  let paidFieldClass = 'border-border bg-card';
  if (
    totalDue !== null &&
    paidInput !== '' &&
    !Number.isNaN(paidUi) &&
    paidCentsUi !== null &&
    balCentsUi !== null
  ) {
    if (paidCentsUi > balCentsUi) {
      paidFieldClass = 'border-red-300 bg-red-50 text-red-900';
    } else if (paidCentsUi < balCentsUi) {
      paidFieldClass = 'border-amber-300 bg-amber-50 text-amber-950';
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadMut.mutateAsync({
        bookingId: booking.id,
        assetType: 'guest_balance_payment_receipt',
        file,
      });
      setReceiptUrl(result.url);
      toast.success('Payment balance receipt uploaded');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to upload receipt',
      );
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <WorkflowSubFormCard
      title="Guest balance settlement"
      bodyClassName="space-y-4"
    >
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Total guest balance
        </span>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
            totalDue === null
              ? 'bg-amber-50 text-amber-900 ring-amber-200'
              : 'bg-muted text-foreground ring-slate-200',
          )}
        >
          {totalDue === null
            ? 'Missing — complete pricing first'
            : formatMoney(totalDue)}
        </span>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="guest-balance-paid"
          className="block text-xs text-muted-foreground"
        >
          Balance amount paid <span className="text-red-600">*</span>
        </label>
        <input
          id="guest-balance-paid"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          disabled={totalDue === null}
          value={paidInput}
          onChange={(e) => setPaidInput(e.target.value)}
          className={cn(
            'h-10 w-full rounded-md border px-3 text-sm',
            paidFieldClass,
          )}
        />
      </div>

      <div className="space-y-1">
        <span className="block text-xs text-muted-foreground">
          Payment balance receipt
          {receiptRequired ? (
            <>
              {' '}
              <span className="text-red-600">*</span>
            </>
          ) : null}
        </span>
        {!receiptRequired && totalDue !== null ? (
          <p className="text-[10.5px] leading-snug text-muted-foreground">
            Not required when total guest balance is {formatMoney(totalDue)}.
          </p>
        ) : null}
        <div className="space-y-2">
          {receiptUrl ? (
            <a
              href={receiptImgSrc ?? receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-card p-2 hover:border-blue-300 transition-colors"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                {!receiptImgSrc ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <Loader2
                      className="size-5 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                ) : receiptImgFailed ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <FileImage className="size-5 text-muted-foreground" aria-hidden />
                  </div>
                ) : (
                  <img
                    src={receiptImgSrc}
                    alt=""
                    className="h-full w-full shrink-0 object-cover"
                    width={48}
                    height={48}
                    onError={() => setReceiptImgFailed(true)}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">
                  Current receipt
                </p>
                <p className="inline-flex items-center gap-1 text-[11px] text-blue-600 group-hover:underline">
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                  View image
                </p>
              </div>
            </a>
          ) : (
            <div className="flex min-h-[44px] items-center justify-center rounded-lg border border-dashed border-border bg-card px-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <FileImage className="size-3.5 shrink-0" aria-hidden />
                No payment balance receipt uploaded
              </span>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
            disabled={uploadMut.isPending}
          />
          <button
            type="button"
            disabled={uploadMut.isPending || totalDue === null}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              uploadMut.isPending || totalDue === null
                ? 'cursor-not-allowed bg-muted text-muted-foreground ring-1 ring-slate-200'
                : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100',
            )}
          >
            {uploadMut.isPending ? (
              <>
                <Loader2
                  className="size-3.5 shrink-0 animate-spin"
                  aria-hidden
                />
                Uploading image…
              </>
            ) : (
              <>
                <Upload className="size-3.5 shrink-0" aria-hidden />
                {receiptUrl
                  ? 'Replace payment balance receipt'
                  : 'Upload payment balance receipt'}
              </>
            )}
          </button>
        </div>
      </div>
    </WorkflowSubFormCard>
  );
}
