/**
 * SdRefundForm — Sub-form shown in WorkflowPanel when transitioning
 * PENDING_SD_REFUND → COMPLETED.
 *
 * Captures: sd_additional_expenses (array), sd_additional_profits (array),
 *           sd_refund_amount, sd_refund_receipt_url.
 *
 * Plan: docs/NEW_FLOW_PLAN.md §2 (sd columns), §6.1 Q2.1
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '@/features/admin/lib/formatters';
import type { BookingRow } from '@/features/admin/lib/types';

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

function methodLabel(
  method: NonNullable<BookingRow['sd_refund_method']>,
): string {
  if (method === 'same_phone') return 'GCash (same number as phone on file)';
  if (method === 'cash') return 'Cash pickup';
  return 'Bank / e-wallet transfer';
}

export type SdRefundValues = {
  sd_additional_expenses: number[];
  sd_additional_profits: number[];
  sd_refund_amount: number;
  sd_refund_receipt_url: string;
};

type Props = {
  booking: BookingRow;
  onChange: (values: SdRefundValues | null) => void;
};

function useNumberList(initial: number[] = []) {
  const [items, setItems] = useState<number[]>(initial);

  const add = () => setItems((prev) => [...prev, 0]);
  const remove = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const update = (i: number, val: number) =>
    setItems((prev) => prev.map((v, idx) => (idx === i ? val : v)));

  return { items, add, remove, update };
}

const SD_DEFAULT = 1500;

export function SdRefundForm({ booking, onChange }: Props) {
  const expenses = useNumberList(
    parseNumberArray(booking.sd_additional_expenses),
  );
  const profits = useNumberList(
    parseNumberArray(booking.sd_additional_profits),
  );
  const sdAmt = booking.sd_refund_amount;
  const [refundAmount, setRefundAmount] = useState<number>(
    sdAmt != null && sdAmt !== '' ? Number(sdAmt) : SD_DEFAULT,
  );
  const [receiptUrl, setReceiptUrl] = useState<string>(
    booking.sd_refund_receipt_url ?? '',
  );

  const guestMethod = booking.sd_refund_method;

  const totalExpenses = expenses.items.reduce((s, v) => s + (v || 0), 0);
  const totalProfits = profits.items.reduce((s, v) => s + (v || 0), 0);
  const netSD =
    ((booking.security_deposit as number | null) ?? SD_DEFAULT) -
    totalExpenses +
    totalProfits;

  useEffect(() => {
    if (refundAmount >= 0) {
      onChange({
        sd_additional_expenses: expenses.items,
        sd_additional_profits: profits.items,
        sd_refund_amount: refundAmount,
        sd_refund_receipt_url: receiptUrl,
      });
    } else {
      onChange(null);
    }
  }, [
    JSON.stringify(expenses.items),
    JSON.stringify(profits.items),
    refundAmount,
    receiptUrl,
  ]);

  return (
    <div className="space-y-4">
      {guestMethod && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Guest refund method
          </p>
          <dl className="space-y-1.5 text-sm text-slate-700">
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-slate-500">Method</dt>
              <dd className="text-right font-medium">
                {methodLabel(guestMethod)}
              </dd>
            </div>
            {guestMethod === 'same_phone' && (
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500">Phone on file</dt>
                <dd className="text-right break-all">
                  {booking.guest_phone_number}
                </dd>
              </div>
            )}
            {guestMethod === 'other_bank' && (
              <>
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-slate-500">Bank</dt>
                  <dd className="text-right font-medium">
                    {booking.sd_refund_bank ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-slate-500">Account name</dt>
                  <dd className="text-right break-all">
                    {booking.sd_refund_account_name ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-slate-500">Account number</dt>
                  <dd className="text-right break-all font-mono text-xs">
                    {booking.sd_refund_account_number ?? '—'}
                  </dd>
                </div>
              </>
            )}
            {guestMethod === 'cash' && booking.sd_refund_cash_pickup_note && (
              <div className="space-y-0.5">
                <dt className="text-slate-500">Guest note</dt>
                <dd className="text-[13px] leading-snug whitespace-pre-wrap">
                  {booking.sd_refund_cash_pickup_note}
                </dd>
              </div>
            )}
            {booking.sd_refund_guest_feedback && (
              <div className="space-y-0.5 border-t border-slate-200 pt-2 mt-1">
                <dt className="text-slate-500">Guest feedback</dt>
                <dd className="text-[13px] leading-snug whitespace-pre-wrap text-slate-600">
                  {booking.sd_refund_guest_feedback}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Security Deposit Settlement
      </p>

      {/* Security Deposit base */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">Security Deposit (base)</span>
        <span className="font-medium">
          {formatMoney(
            (booking.security_deposit as number | null) ?? SD_DEFAULT,
          )}
        </span>
      </div>

      {/* Additional Expenses */}
      <NumberListSection
        label="Additional Expenses"
        items={expenses.items}
        onAdd={expenses.add}
        onRemove={expenses.remove}
        onUpdate={expenses.update}
        sign="-"
      />

      {/* Additional Profits */}
      <NumberListSection
        label="Additional Profits"
        items={profits.items}
        onAdd={profits.add}
        onRemove={profits.remove}
        onUpdate={profits.update}
        sign="+"
      />

      {/* Net SD suggestion */}
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200 text-sm">
        <span className="text-slate-600">Calculated Net SD</span>
        <span
          className={`font-semibold ${netSD < 0 ? 'text-red-600' : 'text-slate-900'}`}
        >
          {formatMoney(netSD)}
        </span>
      </div>

      {/* Actual refund amount */}
      <div className="space-y-1">
        <label className="block text-xs text-slate-600">
          Actual Refund Amount (₱)
        </label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={refundAmount}
          onChange={(e) => setRefundAmount(Number(e.target.value))}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>

      {/* Receipt URL */}
      <div className="space-y-1">
        <label className="block text-xs text-slate-600">
          Refund Receipt URL (optional)
        </label>
        <input
          type="url"
          placeholder="https://..."
          value={receiptUrl}
          onChange={(e) => setReceiptUrl(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>
    </div>
  );
}

// ─── Tiny list sub-component ──────────────────────────────────────────────────

function NumberListSection({
  label,
  items,
  onAdd,
  onRemove,
  onUpdate,
  sign,
}: {
  label: string;
  items: number[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, v: number) => void;
  sign: '+' | '-';
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600">{label}</span>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          <Plus className="size-3" /> Add
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-[11px] text-slate-400 italic">None added</p>
      )}
      {items.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className={`text-xs font-bold ${sign === '+' ? 'text-emerald-600' : 'text-red-600'}`}
          >
            {sign}
          </span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={val}
            onChange={(e) => onUpdate(i, Number(e.target.value))}
            className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="text-slate-400 hover:text-red-500"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
