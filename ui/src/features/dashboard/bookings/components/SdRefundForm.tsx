/**
 * SdRefundForm — Sub-form shown in WorkflowPanel when transitioning
 * PENDING_SD_REFUND → COMPLETED.
 *
 * Captures: sd_additional_expense_items / sd_additional_profit_items (label + amount),
 *           sd_refund_amount (read-only): base SD + Σ(expenses) − Σ(profits),
 *           sd_refund_receipt_url (image upload).
 *
 * Plan: docs/planning/NEW_FLOW_PLAN.md §2 (sd columns), §6.1 Q2.1
 */

import { useEffect, useState } from 'react';

import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { BookingCompactAssetControl } from '@/features/dashboard/bookings/components/BookingCompactAssetControl';
import { GuestSdRefundDetailsSection } from '@/features/dashboard/bookings/components/GuestSdRefundDetailsSection';
import {
  WorkflowFormShell,
  workflowFormEditTitle,
  type WorkflowFormVariant,
} from '@/features/dashboard/bookings/components/WorkflowFormShell';
import { useClearBookingAsset } from '@/features/dashboard/bookings/hooks/useClearBookingAsset';
import type { BookingAssetPreviewHandler } from '@/features/dashboard/bookings/hooks/useBookingAssetPreview';
import { useUploadBookingAsset } from '@/features/dashboard/bookings/hooks/useUploadBookingAsset';
import type { BookingRow, SdSettlementLineItem } from '@/features/dashboard/bookings/lib/types';

import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/format/currency';

function parseNumberArray(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.map((v) => Number(v)).filter((n) => !Number.isNaN(n))
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseLineItemsFromBooking(raw: unknown): SdSettlementLineItem[] | null {
  let arr: unknown = raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      arr = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr.map((row) => {
    if (typeof row !== 'object' || row === null) {
      return { label: '', amount: 0 };
    }
    const r = row as Record<string, unknown>;
    const label = typeof r.label === 'string' ? r.label : '';
    const n = Number(r.amount);
    return {
      label,
      amount: Number.isNaN(n) ? 0 : n,
    };
  });
}

function buildInitialLineItems(booking: BookingRow): {
  expenses: SdSettlementLineItem[];
  profits: SdSettlementLineItem[];
} {
  const expJson = parseLineItemsFromBooking(booking.sd_additional_expense_items);
  const profJson = parseLineItemsFromBooking(booking.sd_additional_profit_items);
  const expFallback = parseNumberArray(booking.sd_additional_expenses).map((amount) => ({
    label: '',
    amount,
  }));
  const profFallback = parseNumberArray(booking.sd_additional_profits).map((amount) => ({
    label: '',
    amount,
  }));
  return {
    expenses: expJson ?? (expFallback.length ? expFallback : []),
    profits: profJson ?? (profFallback.length ? profFallback : []),
  };
}

function buildSdInitialState(
  booking: BookingRow,
  draft: SdRefundValues | null | undefined
): {
  expenseItems: SdSettlementLineItem[];
  profitItems: SdSettlementLineItem[];
  receiptUrl: string;
} {
  if (draft) {
    return {
      expenseItems: draft.sd_additional_expense_items.map((r) => ({ ...r })),
      profitItems: draft.sd_additional_profit_items.map((r) => ({ ...r })),
      receiptUrl: draft.sd_refund_receipt_url ?? '',
    };
  }
  const built = buildInitialLineItems(booking);
  return {
    expenseItems: built.expenses,
    profitItems: built.profits,
    receiptUrl: booking.sd_refund_receipt_url ?? '',
  };
}

/** Digits only — used for `gcash://` deep links. */
function phoneDigitsOnly(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return raw.replace(/\D/g, '');
}

export type SdRefundValues = {
  sd_additional_expense_items: SdSettlementLineItem[];
  sd_additional_profit_items: SdSettlementLineItem[];
  sd_refund_amount: number;
  sd_refund_receipt_url: string;
};

type Props = {
  booking: BookingRow;
  initialDraft?: SdRefundValues | null;
  onChange: (values: SdRefundValues | null) => void;
  readOnly?: boolean;
  editMode?: boolean;
  variant?: WorkflowFormVariant;
  /** When false, guest SD refund submission is omitted (shown separately in edit form). */
  showGuestDetails?: boolean;
  onPreview: BookingAssetPreviewHandler;
};

const SD_DEFAULT = 1500;

export function SdRefundForm({
  booking,
  initialDraft = null,
  onChange,
  readOnly = false,
  editMode = false,
  variant = 'workflow',
  showGuestDetails = true,
  onPreview,
}: Props) {
  const uploadMut = useUploadBookingAsset();
  const clearAssetMut = useClearBookingAsset();

  const sdInitial = buildSdInitialState(booking, initialDraft);

  const [expenseItems, setExpenseItems] = useState<SdSettlementLineItem[]>(
    () => sdInitial.expenseItems
  );
  const [profitItems, setProfitItems] = useState<SdSettlementLineItem[]>(
    () => sdInitial.profitItems
  );
  const [receiptUrl, setReceiptUrl] = useState<string>(() => sdInitial.receiptUrl);

  const guestMethod = booking.sd_refund_method;

  const rawBase = Number(booking.security_deposit);
  const baseSd =
    booking.security_deposit == null || booking.security_deposit === '' || Number.isNaN(rawBase)
      ? SD_DEFAULT
      : rawBase;

  const totalExpenses = expenseItems.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalProfits = profitItems.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  /** Refund = base SD + additional expenses charged to guest − profits retained from guest. */
  const netSD = baseSd + totalExpenses - totalProfits;

  const phoneDigits = phoneDigitsOnly(booking.guest_phone_number);
  const otherBankGcashDigits = phoneDigitsOnly(booking.sd_refund_account_number);
  /** GCash app send link: on-file phone (same_phone) or guest-submitted GCash number (other_bank + GCash). */
  const gcashDestinationDigits =
    guestMethod === 'same_phone'
      ? phoneDigits
      : guestMethod === 'other_bank' && booking.sd_refund_bank === 'GCash'
        ? otherBankGcashDigits
        : '';
  const refundAmountForGcash =
    netSD > 0 && Number.isFinite(netSD) ? (Math.round(netSD * 100) / 100).toFixed(2) : '';
  const gcashSendHref =
    gcashDestinationDigits.length >= 10 && refundAmountForGcash
      ? `gcash://send?mobile=${gcashDestinationDigits}&amount=${refundAmountForGcash}`
      : null;

  useEffect(() => {
    setReceiptUrl(booking.sd_refund_receipt_url?.trim() ?? '');
  }, [booking.sd_refund_receipt_url]);

  useEffect(() => {
    if (readOnly) return;
    if (editMode || netSD >= 0) {
      onChange({
        sd_additional_expense_items: expenseItems,
        sd_additional_profit_items: profitItems,
        sd_refund_amount: Math.round(netSD * 100) / 100,
        sd_refund_receipt_url: receiptUrl,
      });
    } else {
      onChange(null);
    }
  }, [expenseItems, profitItems, netSD, receiptUrl, readOnly, editMode]);

  async function handleReceiptFile(file: File) {
    try {
      const result = await uploadMut.mutateAsync({
        bookingId: booking.id,
        assetType: 'sd_refund_receipt',
        file,
      });
      setReceiptUrl(result.url);
      toast.success('Refund receipt uploaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload refund receipt');
      throw err;
    }
  }

  async function handleRemoveReceipt() {
    setReceiptUrl('');
    if (readOnly) return;
    try {
      await clearAssetMut.mutateAsync({
        bookingId: booking.id,
        assetType: 'sd_refund_receipt',
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove refund receipt');
      throw err;
    }
  }

  function addExpense() {
    setExpenseItems((prev) => [...prev, { label: '', amount: 0 }]);
  }
  function addProfit() {
    setProfitItems((prev) => [...prev, { label: '', amount: 0 }]);
  }
  function removeExpense(i: number) {
    setExpenseItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function removeProfit(i: number) {
    setProfitItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function patchExpense(i: number, patch: Partial<SdSettlementLineItem>) {
    setExpenseItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function patchProfit(i: number, patch: Partial<SdSettlementLineItem>) {
    setProfitItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  const cardTitle =
    variant === 'edit' ? workflowFormEditTitle('SD settlement') : 'Security deposit settlement';

  return (
    <WorkflowFormShell title={cardTitle} variant={variant} bodyClassName="space-y-4">
      {showGuestDetails && guestMethod ? (
        <GuestSdRefundDetailsSection booking={booking} variant="workflow" />
      ) : null}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Security Deposit (base)</span>
        <span className="font-medium">{formatMoney(baseSd)}</span>
      </div>

      <LineListSection
        label="Additional Expenses"
        sign="+"
        items={expenseItems}
        onAdd={addExpense}
        onRemove={removeExpense}
        onPatch={patchExpense}
        amountPlaceholder="Amount"
        labelPlaceholder="Pool fee payment"
        readOnly={readOnly}
      />

      <LineListSection
        label="Additional Profits"
        sign="-"
        items={profitItems}
        onAdd={addProfit}
        onRemove={removeProfit}
        onPatch={patchProfit}
        amountPlaceholder="Amount"
        labelPlaceholder="Honesty store payment"
        readOnly={readOnly}
      />

      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-muted-foreground block text-xs">
            Actual Refund Amount{' '}
            <span className="text-muted-foreground font-normal">(base + expenses − profits)</span>
          </label>
          <div
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm',
              netSD < 0
                ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
                : 'border-border bg-muted/50 text-foreground'
            )}
            aria-readonly="true"
          >
            <span className="font-semibold">{formatMoney(netSD)}</span>
            {netSD < 0 && <span className="text-[11px] font-medium">Net cannot be negative</span>}
          </div>
        </div>
        {gcashSendHref && (
          <a
            href={gcashSendHref}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0074FF] px-3 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-[#0066CC] transition-colors hover:bg-[#0066E6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074FF] focus-visible:ring-offset-2 active:bg-[#005AD9]"
          >
            Pay now with GCash
          </a>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-muted-foreground block text-xs">Refund receipt (optional)</label>
        <BookingCompactAssetControl
          label="Refund receipt"
          showLabel={false}
          currentUrl={receiptUrl}
          accept="image/*"
          readOnly={readOnly}
          uploading={uploadMut.isPending}
          removing={clearAssetMut.isPending}
          onSelectFile={handleReceiptFile}
          onRemove={handleRemoveReceipt}
          onPreview={onPreview}
        />
      </div>
    </WorkflowFormShell>
  );
}

function LineListSection({
  label,
  sign,
  items,
  onAdd,
  onRemove,
  onPatch,
  labelPlaceholder,
  amountPlaceholder,
  readOnly = false,
}: {
  label: string;
  sign: '+' | '-';
  items: SdSettlementLineItem[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onPatch: (i: number, patch: Partial<SdSettlementLineItem>) => void;
  labelPlaceholder: string;
  amountPlaceholder: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">{label}</span>
        {!readOnly ? (
          <button
            type="button"
            onClick={onAdd}
            className="text-primary hover:text-primary/90 dark:text-primary dark:hover:text-primary/90 flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium sm:min-h-0 sm:min-w-0 sm:justify-end"
          >
            <Plus className="size-3 shrink-0" /> Add
          </button>
        ) : null}
      </div>
      {items.length === 0 && <p className="text-muted-foreground text-[11px] italic">None added</p>}
      {items.map((row, i) => (
        <div key={i} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-1.5">
          <span
            className={`hidden shrink-0 text-xs font-bold sm:inline sm:w-3 ${sign === '+' ? 'text-emerald-600' : 'text-red-600'}`}
          >
            {sign}
          </span>
          <input
            type="text"
            value={row.label}
            onChange={(e) => onPatch(i, { label: e.target.value })}
            placeholder={labelPlaceholder}
            readOnly={readOnly}
            className={cn(
              'border-border bg-card field-focus h-9 min-w-0 flex-1 rounded-md border px-2 py-1 text-[13px] leading-tight',
              readOnly && 'bg-muted/40 text-foreground cursor-default'
            )}
          />
          <div className="flex items-center gap-1.5">
            <span
              className={`shrink-0 text-xs font-bold sm:hidden ${sign === '+' ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {sign}
            </span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={row.amount}
              onChange={(e) => onPatch(i, { amount: Number(e.target.value) })}
              placeholder={amountPlaceholder}
              readOnly={readOnly}
              className={cn(
                'border-border bg-card field-focus h-9 w-full min-w-0 flex-1 rounded-md border px-2 py-1 text-[13px] leading-tight sm:w-24 sm:min-w-[5.5rem] sm:flex-none',
                readOnly && 'bg-muted/40 text-foreground cursor-default'
              )}
            />
            {!readOnly ? (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-muted-foreground hover:bg-muted flex size-11 shrink-0 items-center justify-center rounded-md hover:text-red-600"
                aria-label="Remove row"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
