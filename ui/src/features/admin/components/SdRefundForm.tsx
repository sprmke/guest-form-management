/**
 * SdRefundForm — Sub-form shown in WorkflowPanel when transitioning
 * PENDING_SD_REFUND → COMPLETED.
 *
 * Captures: sd_additional_expense_items / sd_additional_profit_items (label + amount),
 *           sd_refund_amount (read-only): base SD + Σ(expenses) − Σ(profits),
 *           sd_refund_receipt_url (image upload).
 *
 * Plan: docs/NEW_FLOW_PLAN.md §2 (sd columns), §6.1 Q2.1
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Copy,
  ExternalLink,
  FileImage,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/features/admin/lib/formatters';
import type {
  BookingRow,
  SdSettlementLineItem,
} from '@/features/admin/lib/types';
import { useUploadBookingAsset } from '@/features/admin/hooks/useUploadBookingAsset';
import { cn } from '@/lib/utils';

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

function parseLineItemsFromBooking(
  raw: unknown,
): SdSettlementLineItem[] | null {
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
  const expJson = parseLineItemsFromBooking(
    booking.sd_additional_expense_items,
  );
  const profJson = parseLineItemsFromBooking(
    booking.sd_additional_profit_items,
  );
  const expFallback = parseNumberArray(booking.sd_additional_expenses).map(
    (amount) => ({
      label: '',
      amount,
    }),
  );
  const profFallback = parseNumberArray(booking.sd_additional_profits).map(
    (amount) => ({
      label: '',
      amount,
    }),
  );
  return {
    expenses: expJson ?? (expFallback.length ? expFallback : []),
    profits: profJson ?? (profFallback.length ? profFallback : []),
  };
}

function buildSdInitialState(
  booking: BookingRow,
  draft: SdRefundValues | null | undefined,
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

function methodLabel(
  method: NonNullable<BookingRow['sd_refund_method']>,
): string {
  if (method === 'same_phone') return 'GCash (same number as phone on file)';
  if (method === 'cash') return 'Cash pickup';
  return 'Bank / e-wallet transfer';
}

function RefundSummaryRow({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="py-3 border-b border-slate-100 first:pt-0 last:border-b-0">
      <p className="text-[11px] font-medium leading-tight text-slate-500">
        {label}
      </p>
      <div
        className={cn(
          'mt-1.5 text-sm leading-relaxed text-slate-900 break-words',
          mono && 'font-mono text-[13px] tracking-tight text-slate-800',
        )}
      >
        {children}
      </div>
    </div>
  );
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
};

const SD_DEFAULT = 1500;

export function SdRefundForm({
  booking,
  initialDraft = null,
  onChange,
}: Props) {
  const uploadMut = useUploadBookingAsset();
  const receiptFileRef = useRef<HTMLInputElement>(null);

  const sdInitial = buildSdInitialState(booking, initialDraft);

  const [expenseItems, setExpenseItems] = useState<SdSettlementLineItem[]>(
    () => sdInitial.expenseItems,
  );
  const [profitItems, setProfitItems] = useState<SdSettlementLineItem[]>(
    () => sdInitial.profitItems,
  );
  const [receiptUrl, setReceiptUrl] = useState<string>(
    () => sdInitial.receiptUrl,
  );

  const guestMethod = booking.sd_refund_method;

  const rawBase = Number(booking.security_deposit);
  const baseSd =
    booking.security_deposit == null ||
    booking.security_deposit === '' ||
    Number.isNaN(rawBase)
      ? SD_DEFAULT
      : rawBase;

  const totalExpenses = expenseItems.reduce(
    (s, r) => s + (Number(r.amount) || 0),
    0,
  );
  const totalProfits = profitItems.reduce(
    (s, r) => s + (Number(r.amount) || 0),
    0,
  );
  /** Refund = base SD + additional expenses charged to guest − profits retained from guest. */
  const netSD = baseSd + totalExpenses - totalProfits;

  const phoneDisplay = booking.guest_phone_number?.trim() ?? '';
  const phoneDigits = phoneDigitsOnly(booking.guest_phone_number);
  const refundAmountForGcash =
    netSD > 0 && Number.isFinite(netSD)
      ? (Math.round(netSD * 100) / 100).toFixed(2)
      : '';
  const gcashSendHref =
    guestMethod === 'same_phone' &&
    phoneDigits.length >= 10 &&
    refundAmountForGcash
      ? `gcash://send?mobile=${phoneDigits}&amount=${refundAmountForGcash}`
      : null;

  async function copyGuestPhone() {
    if (!phoneDisplay) return;
    try {
      await navigator.clipboard.writeText(phoneDisplay);
      toast.success('Phone number copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  useEffect(() => {
    const url = booking.sd_refund_receipt_url;
    if (url) setReceiptUrl(url);
  }, [booking.sd_refund_receipt_url]);

  useEffect(() => {
    if (netSD >= 0) {
      onChange({
        sd_additional_expense_items: expenseItems,
        sd_additional_profit_items: profitItems,
        sd_refund_amount: Math.round(netSD * 100) / 100,
        sd_refund_receipt_url: receiptUrl,
      });
    } else {
      onChange(null);
    }
  }, [expenseItems, profitItems, netSD, receiptUrl]);

  async function handleReceiptFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadMut.mutateAsync({
        bookingId: booking.id,
        assetType: 'sd_refund_receipt',
        file,
      });
      setReceiptUrl(result.url);
      toast.success('Refund receipt uploaded');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to upload refund receipt',
      );
    } finally {
      if (receiptFileRef.current) receiptFileRef.current.value = '';
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
    setExpenseItems((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );
  }
  function patchProfit(i: number, patch: Partial<SdSettlementLineItem>) {
    setProfitItems((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="space-y-4">
      {guestMethod && (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm sm:px-5">
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
            Guest refund method
          </p>
          <div className="mt-2 min-w-0">
            <RefundSummaryRow label="Method">
              {methodLabel(guestMethod)}
            </RefundSummaryRow>
            {guestMethod === 'same_phone' && (
              <div className="py-3 border-b border-slate-100 first:pt-0 last:border-b-0">
                <p className="text-[11px] font-medium leading-tight text-slate-500">
                  Phone on file
                </p>
                <div className="mt-1.5 flex min-h-[44px] flex-wrap items-center gap-2 sm:min-h-0">
                  <span
                    className={cn(
                      'min-w-0 break-words font-mono text-[13px] leading-relaxed tracking-tight text-slate-800',
                      !phoneDisplay && 'text-slate-400',
                    )}
                  >
                    {phoneDisplay || '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyGuestPhone()}
                    disabled={!phoneDisplay}
                    className={cn(
                      'flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ring-1 transition-colors sm:min-h-0',
                      phoneDisplay
                        ? 'bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100'
                        : 'cursor-not-allowed bg-slate-50 text-slate-400 ring-slate-200',
                    )}
                    aria-label="Copy phone number to clipboard"
                  >
                    <Copy className="size-4 shrink-0" aria-hidden />
                    Copy
                  </button>
                </div>
              </div>
            )}
            {guestMethod === 'other_bank' && (
              <>
                <RefundSummaryRow label="Bank">
                  {booking.sd_refund_bank ?? '—'}
                </RefundSummaryRow>
                <RefundSummaryRow label="Account name">
                  {booking.sd_refund_account_name ?? '—'}
                </RefundSummaryRow>
                <RefundSummaryRow label="Account number" mono>
                  {booking.sd_refund_account_number ?? '—'}
                </RefundSummaryRow>
              </>
            )}
            {guestMethod === 'cash' && booking.sd_refund_cash_pickup_note && (
              <RefundSummaryRow label="Guest note (cash pickup)">
                <span className="whitespace-pre-wrap">
                  {booking.sd_refund_cash_pickup_note}
                </span>
              </RefundSummaryRow>
            )}
            {booking.sd_refund_guest_feedback && (
              <RefundSummaryRow label="Guest feedback">
                <span className="whitespace-pre-wrap text-slate-700">
                  {booking.sd_refund_guest_feedback}
                </span>
              </RefundSummaryRow>
            )}
          </div>
        </div>
      )}

      <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">
        Security Deposit Settlement
      </p>

      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-600">Security Deposit (base)</span>
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
      />

      <div className="space-y-2">
        <div className="space-y-1">
          <label className="block text-xs text-slate-600">
            Actual Refund Amount{' '}
            <span className="font-normal text-slate-400">
              (base + expenses − profits)
            </span>
          </label>
          <div
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm',
              netSD < 0
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-slate-200 bg-slate-50 text-slate-900',
            )}
            aria-readonly="true"
          >
            <span className="font-semibold">{formatMoney(netSD)}</span>
            {netSD < 0 && (
              <span className="text-[11px] font-medium">
                Net cannot be negative
              </span>
            )}
          </div>
        </div>
        {gcashSendHref && (
          <a
            href={gcashSendHref}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0074FF] px-3 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-[#0066CC] transition-colors hover:bg-[#0066E6] active:bg-[#005AD9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0074FF] focus-visible:ring-offset-2"
          >
            Pay now with GCash
          </a>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-xs text-slate-600">
          Refund receipt (optional)
        </label>
        <div className="space-y-2">
          {receiptUrl ? (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 hover:border-blue-300 transition-colors"
            >
              <div className="overflow-hidden w-12 h-12 rounded-md shrink-0 bg-slate-100">
                <img
                  src={receiptUrl}
                  alt="Refund receipt"
                  className="object-cover w-full h-full shrink-0"
                  width={48}
                  height={48}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700">
                  Current receipt
                </p>
                <p className="inline-flex items-center gap-1 text-[11px] text-blue-600 group-hover:underline">
                  <ExternalLink className="size-3 shrink-0" />
                  View image
                </p>
              </div>
            </a>
          ) : (
            <div className="flex min-h-[44px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <FileImage className="size-3.5 shrink-0" />
                No receipt uploaded
              </span>
            </div>
          )}

          <input
            ref={receiptFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleReceiptFileChange}
            disabled={uploadMut.isPending}
          />
          <button
            type="button"
            disabled={uploadMut.isPending}
            onClick={() => receiptFileRef.current?.click()}
            className={cn(
              'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              uploadMut.isPending
                ? 'cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200'
                : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100',
            )}
          >
            {uploadMut.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin shrink-0" />
                Uploading image…
              </>
            ) : (
              <>
                <Upload className="size-3.5 shrink-0" />
                {receiptUrl ? 'Replace receipt image' : 'Upload receipt image'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
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
}: {
  label: string;
  sign: '+' | '-';
  items: SdSettlementLineItem[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onPatch: (i: number, patch: Partial<SdSettlementLineItem>) => void;
  labelPlaceholder: string;
  amountPlaceholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2 justify-between items-center">
        <span className="text-xs text-slate-600">{label}</span>
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-blue-600 hover:text-blue-700 sm:min-h-0 sm:min-w-0 sm:justify-end"
        >
          <Plus className="size-3 shrink-0" /> Add
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-[11px] text-slate-400 italic">None added</p>
      )}
      {items.map((row, i) => (
        <div
          key={i}
          className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-1.5"
        >
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
            className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
              className="h-9 w-full min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:w-24 sm:flex-none sm:min-w-[5.5rem]"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="flex justify-center items-center rounded-md size-11 shrink-0 text-slate-400 hover:bg-slate-100 hover:text-red-600"
              aria-label="Remove row"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
