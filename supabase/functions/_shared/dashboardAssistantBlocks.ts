/**
 * Host-facing ChatBlock cleanup for the dashboard assistant.
 * Gemini structured output often emits empty cards or data_table rows whose keys
 * don't match column headers — never show those to the host.
 */

import { computeBookingFinancials } from './bookingFinance.ts';
import { isBookingStatus, STATUS_HUMAN_LABEL } from './statusMachine.ts';
import type { ChatBlock } from './dashboardAssistantSafetyGuard.ts';

const STATUS_CODE_RE = /\b([A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+)\b/g;

function keySlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function asDisplay(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

function recordHasContent(record: Record<string, string | number>): boolean {
  return Object.values(record).some((value) => String(value).trim() !== '');
}

function rowToRecord(row: unknown, columns: string[]): Record<string, string | number> | null {
  if (row == null) return null;

  if (Array.isArray(row)) {
    const record: Record<string, string | number> = {};
    columns.forEach((col, i) => {
      record[col] = asDisplay(row[i]);
    });
    return recordHasContent(record) ? record : null;
  }

  if (typeof row !== 'object') return null;
  const obj = row as Record<string, unknown>;

  if (Array.isArray(obj.cells)) {
    const record: Record<string, string | number> = {};
    columns.forEach((col, i) => {
      record[col] = asDisplay(obj.cells[i]);
    });
    return recordHasContent(record) ? record : null;
  }

  const bySlug = new Map<string, unknown>();
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'cells' || key === 'type') continue;
    bySlug.set(keySlug(key), value);
  }

  const record: Record<string, string | number> = {};
  for (const col of columns) {
    if (obj[col] != null && asDisplay(obj[col]) !== '') {
      const raw = obj[col];
      record[col] = typeof raw === 'number' && Number.isFinite(raw) ? raw : asDisplay(raw);
      continue;
    }
    const match = bySlug.get(keySlug(col));
    record[col] = typeof match === 'number' && Number.isFinite(match) ? match : asDisplay(match);
  }

  return recordHasContent(record) ? record : null;
}

export function humanizeStatusCodesInText(text: string): string {
  return text.replace(STATUS_CODE_RE, (code) => {
    if (isBookingStatus(code)) return STATUS_HUMAN_LABEL[code];
    return code;
  });
}

export function pendingTasksForBooking(booking: Record<string, unknown>): string[] {
  const status = String(booking.status ?? '');
  const sd = Number(booking.security_deposit ?? 0);
  const formSubmitted = Boolean(
    booking.sd_refund_form_submitted_at && String(booking.sd_refund_form_submitted_at).trim()
  );
  const formEmailed = Boolean(
    booking.sd_refund_form_emailed_at && String(booking.sd_refund_form_emailed_at).trim()
  );

  switch (status) {
    case 'PENDING_REVIEW':
      return ['Review guest details, pricing, IDs, and downpayment, then proceed.'];
    case 'PENDING_DOCUMENTS':
    case 'PENDING_GAF':
    case 'PENDING_PARKING_REQUEST':
    case 'PENDING_PET_REQUEST':
      return [
        'Complete the required building documents. This step moves forward automatically once they are done.',
      ];
    case 'READY_FOR_CHECKIN':
      return [
        'Settle the remaining guest balance and upload the receipt.',
        'Check-out instructions go to the guest automatically near checkout.',
      ];
    case 'READY_FOR_CHECKOUT':
      if (!(sd > 0)) {
        return ['No security deposit on this stay — proceed to complete the booking.'];
      }
      if (!formSubmitted) {
        const tasks = ['Waiting for the guest to submit the security deposit refund form.'];
        if (!formEmailed) {
          tasks.push(
            'Check-out instructions have not been emailed yet — resend from Automation Triggers if needed.'
          );
        }
        return tasks;
      }
      return [
        'Guest submitted the SD refund form — move to Pending SD Refund if it has not advanced automatically.',
      ];
    case 'PENDING_SD_REFUND':
      return ['Settle the security deposit refund, then proceed to complete the booking.'];
    case 'COMPLETED':
      return ['No pending tasks — this stay is complete.'];
    case 'CANCELLED':
      return ['No pending tasks — this booking is cancelled.'];
    default:
      return [];
  }
}

export function sdRefundAmountForBooking(booking: Record<string, unknown>): number {
  const stored = booking.sd_refund_amount;
  if (stored != null && stored !== '') {
    const n = Number(stored);
    if (Number.isFinite(n)) return Math.round(n * 100) / 100;
  }
  const financials = computeBookingFinancials(booking);
  const deposit = Number(booking.security_deposit ?? 0) || 0;
  return Math.round((deposit + financials.sdExpenseTotal - financials.sdProfitTotal) * 100) / 100;
}

function sanitizeStatList(block: Extract<ChatBlock, { type: 'stat_list' }>): ChatBlock | null {
  const items = (block.items ?? []).filter(
    (item) => asDisplay(item.label) !== '' && asDisplay(item.value) !== ''
  );
  if (items.length === 0) return null;
  return { ...block, items };
}

function sanitizeDataTable(block: Extract<ChatBlock, { type: 'data_table' }>): ChatBlock | null {
  const rawRows = Array.isArray(block.rows) ? (block.rows as unknown[]) : [];
  let columns = (block.columns ?? []).map((col) => String(col).trim()).filter(Boolean);

  if (columns.length === 0 && rawRows.length > 0) {
    const first = rawRows[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      columns = Object.keys(first as Record<string, unknown>).filter(
        (key) => key !== 'cells' && key !== 'type'
      );
    }
  }
  if (columns.length === 0) return null;

  const rows = rawRows
    .map((row) => rowToRecord(row, columns))
    .filter((row): row is Record<string, string | number> => row != null);

  if (rows.length === 0) return null;
  return { ...block, columns, rows };
}

function sanitizeLinkList(block: Extract<ChatBlock, { type: 'link_list' }>): ChatBlock | null {
  const links = (block.links ?? []).filter(
    (link) => asDisplay(link.label) !== '' && asDisplay(link.href) !== ''
  );
  if (links.length === 0) return null;
  return { ...block, links };
}

function sanitizeBookingCard(
  block: Extract<ChatBlock, { type: 'booking_card' }>
): ChatBlock | null {
  if (!asDisplay(block.guestName) && !asDisplay(block.bookingId)) return null;
  return block;
}

/** Drop empty cards, align table cells to column headers, and humanize status codes in text. */
export function sanitizeAssistantChatBlocks(blocks: ChatBlock[]): ChatBlock[] {
  const out: ChatBlock[] = [];
  for (const block of blocks) {
    if (block.type === 'text') {
      const text = humanizeStatusCodesInText(asDisplay(block.text));
      if (!text) continue;
      out.push({ type: 'text', text });
      continue;
    }
    if (block.type === 'stat_list') {
      const next = sanitizeStatList(block);
      if (next) out.push(next);
      continue;
    }
    if (block.type === 'data_table') {
      const next = sanitizeDataTable(block);
      if (next) out.push(next);
      continue;
    }
    if (block.type === 'link_list') {
      const next = sanitizeLinkList(block);
      if (next) out.push(next);
      continue;
    }
    if (block.type === 'booking_card') {
      const next = sanitizeBookingCard(block);
      if (next) out.push(next);
      continue;
    }
    out.push(block);
  }
  return out;
}

function toolResultRecords(toolResults: unknown[]): Record<string, unknown>[] {
  return toolResults.filter((item): item is Record<string, unknown> =>
    Boolean(item && typeof item === 'object' && !Array.isArray(item))
  );
}

function blocksMention(blocks: ChatBlock[], snippet: string): boolean {
  if (!snippet.trim()) return false;
  return JSON.stringify(blocks).includes(snippet);
}

/** Fill in pending tasks / booked stays when the model omitted them from rendered blocks. */
export function hydrateAssistantBlocksFromTools(
  blocks: ChatBlock[],
  toolResults: unknown[]
): ChatBlock[] {
  const records = toolResultRecords(toolResults);
  let next = [...blocks];

  const pendingTasks = records.flatMap((record) =>
    Array.isArray(record.pendingTasks)
      ? record.pendingTasks.map((task) => asDisplay(task)).filter(Boolean)
      : []
  );
  if (pendingTasks.length > 0 && !pendingTasks.every((task) => blocksMention(next, task))) {
    next.push({
      type: 'text',
      text: pendingTasks.map((task) => `• ${task}`).join('\n'),
    });
  }

  const bookedStays = records.flatMap((record) =>
    Array.isArray(record.bookedStays) ? record.bookedStays : []
  ) as Array<Record<string, unknown>>;
  const hasFilledTable = next.some(
    (block) => block.type === 'data_table' && Array.isArray(block.rows) && block.rows.length > 0
  );
  const returnedBookedStays = records.some((record) => Array.isArray(record.bookedStays));
  if (bookedStays.length > 0 && !hasFilledTable) {
    const guestNames = bookedStays.map((stay) => asDisplay(stay.guestName)).filter(Boolean);
    const alreadyListed =
      guestNames.length > 0 && guestNames.every((name) => blocksMention(next, name));
    if (!alreadyListed) {
      const propertyName = asDisplay(
        records.find((record) => asDisplay(record.propertyName))?.propertyName
      );
      const from = asDisplay(records.find((record) => asDisplay(record.from))?.from);
      const to = asDisplay(records.find((record) => asDisplay(record.to))?.to);
      const titleParts = ['Booked stays'];
      if (propertyName) titleParts.push(propertyName);
      if (from && to) titleParts.push(`${from}–${to}`);
      next.push({
        type: 'data_table',
        title: titleParts.join(' · '),
        columns: ['Guest', 'Check-in', 'Check-out'],
        rows: bookedStays.map((stay) => ({
          Guest: asDisplay(stay.guestName) || 'Guest',
          'Check-in': asDisplay(stay.checkIn),
          'Check-out': asDisplay(stay.checkOut),
        })),
      });
    }
  } else if (returnedBookedStays && bookedStays.length === 0 && !hasFilledTable) {
    const emptyLine = 'No booked stays in that date range.';
    if (!blocksMention(next, emptyLine)) {
      next.push({ type: 'text', text: emptyLine });
    }
  }

  return sanitizeAssistantChatBlocks(next);
}
