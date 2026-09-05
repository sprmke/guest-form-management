/**
 * Host-facing labels for dashboard assistant output — never expose raw IDs in chips or copy.
 * Builds a lookup index from tool results + attached context, then rewrites blocks.
 */

import type { AttachedContextItem } from './dashboardAssistantAttachedContext.ts';
import type { ChatBlock } from './dashboardAssistantSafetyGuard.ts';
import {
  filterEchoSuggestionChips,
  sanitizeQuickActionPrompt,
} from './dashboardAssistantActionDisplay.ts';
import { formatDateForEmail, normalizeDateToYYYYMMDD } from './utils.ts';

export type HostEntityKind =
  | 'booking'
  | 'parking_booking'
  | 'property'
  | 'parking'
  | 'team_member'
  | 'maintenance_item'
  | 'finance_item'
  | 'inbox_conversation'
  | 'marketing_template'
  | 'ticket'
  | 'generic';

export type HostDisplayRef = {
  id: string;
  kind: HostEntityKind;
  label: string;
};

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const TECHNICAL_BOOKING_LABEL_RE = /^booking\s*#?\s*[\da-f-]+$/i;
const BOOKING_TOKEN_IN_TEXT_RE = /\bbooking\s*#?\s*([\da-f-]{4,})\b/gi;
const ID_COLUMN_RE = /^(booking\s*)?id$/i;

function asDisplay(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

/** Short stay range for chips — e.g. `Aug 19–Aug 22`. */
export function formatStayDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const formatted = formatDateForEmail(dateStr);
  if (!formatted) return asDisplay(dateStr);
  const parts = formatted.split(',');
  return parts[0]?.trim() ?? formatted;
}

export function formatStayRangeShort(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
): string {
  const ci = formatStayDateShort(checkIn);
  const co = formatStayDateShort(checkOut);
  if (ci && co) return `${ci}–${co}`;
  return ci || co;
}

/** Primary booking label — guest · dates · status (when known). */
export function formatBookingHostLabel(input: {
  guestName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  statusLabel?: string | null;
}): string {
  const guest = asDisplay(input.guestName) || 'Guest';
  const range = formatStayRangeShort(input.checkIn, input.checkOut);
  const status = asDisplay(input.statusLabel);
  const parts = [guest];
  if (range) parts.push(range);
  if (status) parts.push(status);
  return parts.join(' · ');
}

function attachedKindToEntity(type: AttachedContextItem['type']): HostEntityKind {
  if (type === 'parking_booking') return 'parking_booking';
  if (type === 'booking') return 'booking';
  if (type === 'property') return 'property';
  if (type === 'team_member') return 'team_member';
  if (type === 'maintenance_item') return 'maintenance_item';
  if (type === 'finance_item') return 'finance_item';
  if (type === 'inbox_conversation') return 'inbox_conversation';
  if (type === 'ticket') return 'ticket';
  return 'generic';
}

function upsertRef(map: Map<string, HostDisplayRef>, ref: HostDisplayRef): void {
  const key = `${ref.kind}:${ref.id}`;
  const existing = map.get(key);
  if (!existing || existing.label.length < ref.label.length) {
    map.set(key, ref);
  }
}

function bookingFields(obj: Record<string, unknown>): {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  statusLabel: string;
} | null {
  const id = asDisplay(obj.bookingId ?? obj.id);
  if (!id) return null;
  const guestName = asDisplay(
    obj.guestName ?? obj.primary_guest_name ?? obj.guest_facebook_name ?? obj.primaryGuestName
  );
  const checkIn = asDisplay(obj.checkIn ?? obj.check_in_date);
  const checkOut = asDisplay(obj.checkOut ?? obj.check_out_date);
  const statusLabel = asDisplay(obj.statusLabel ?? obj.status_label);
  if (!guestName && !checkIn && !checkOut && !statusLabel) return null;
  return { id, guestName, checkIn, checkOut, statusLabel };
}

function tryAddBookingRef(
  obj: Record<string, unknown>,
  map: Map<string, HostDisplayRef>,
  kind: HostEntityKind = 'booking'
): void {
  const id = asDisplay(obj.bookingId ?? obj.id);
  const presetLabel = asDisplay(obj.hostLabel);
  if (id && presetLabel) {
    upsertRef(map, { id, kind, label: presetLabel });
  }

  const fields = bookingFields(obj);
  if (!fields) return;
  const hostLabel =
    presetLabel ||
    formatBookingHostLabel({
      guestName: fields.guestName,
      checkIn: fields.checkIn,
      checkOut: fields.checkOut,
      statusLabel: fields.statusLabel,
    });
  upsertRef(map, { id: fields.id, kind, label: hostLabel });
}

function tryAddInboxRef(obj: Record<string, unknown>, map: Map<string, HostDisplayRef>): void {
  const participant = asDisplay(obj.participantName ?? obj.participant_name ?? obj.guestName);
  const platform = asDisplay(obj.platform);
  const id = asDisplay(
    obj.conversationId ?? obj.threadId ?? (participant || platform ? obj.id : '')
  );
  if (!id) return;
  const label =
    asDisplay(obj.hostLabel) ||
    [participant || 'Guest', platform].filter(Boolean).join(' · ') ||
    'Conversation';
  upsertRef(map, { id, kind: 'inbox_conversation', label });
}

function tryAddNamedRef(
  obj: Record<string, unknown>,
  map: Map<string, HostDisplayRef>,
  kind: HostEntityKind,
  idKeys: string[],
  labelKeys: string[]
): void {
  const id = idKeys.map((key) => asDisplay(obj[key])).find(Boolean);
  if (!id) return;
  const label =
    asDisplay(obj.hostLabel) ||
    labelKeys.map((key) => asDisplay(obj[key])).find(Boolean) ||
    asDisplay(obj.name) ||
    asDisplay(obj.label);
  if (!label) return;
  upsertRef(map, { id, kind, label });
}

function walkForRefs(value: unknown, map: Map<string, HostDisplayRef>, depth: number): void {
  if (depth > 10 || value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) walkForRefs(item, map, depth + 1);
    return;
  }
  if (typeof value !== 'object') return;

  const obj = value as Record<string, unknown>;
  if (obj.kind === 'booking_journey') {
    tryAddBookingRef(
      {
        bookingId: obj.bookingId,
        guestName: obj.guestName,
        checkIn: obj.checkIn ?? obj.check_in_date,
        checkOut: obj.checkOut ?? obj.check_out_date,
        statusLabel: obj.statusLabel ?? obj.currentStatusLabel,
        hostLabel: obj.hostLabel,
      },
      map
    );
  }

  tryAddBookingRef(
    obj,
    map,
    asDisplay(obj.parkingId ?? obj.parking_id) ? 'parking_booking' : 'booking'
  );
  tryAddInboxRef(obj, map);
  tryAddNamedRef(obj, map, 'property', ['propertyId', 'id'], ['propertyName', 'name']);
  tryAddNamedRef(obj, map, 'parking', ['parkingId', 'id'], ['parkingName', 'name']);
  tryAddNamedRef(obj, map, 'team_member', ['id', 'memberId'], ['name', 'email']);
  tryAddNamedRef(obj, map, 'maintenance_item', ['id'], ['label', 'title', 'name']);
  tryAddNamedRef(obj, map, 'finance_item', ['id'], ['label', 'description']);
  tryAddNamedRef(obj, map, 'marketing_template', ['id', 'templateId'], ['name', 'title']);
  tryAddNamedRef(obj, map, 'ticket', ['id', 'ticketId'], ['subject', 'title']);

  for (const nested of Object.values(obj)) {
    walkForRefs(nested, map, depth + 1);
  }
}

/** Collect human labels for entities mentioned in tool results and composer pins. */
export function collectHostDisplayRefs(
  toolResults: unknown[],
  attachedContext: AttachedContextItem[] = []
): HostDisplayRef[] {
  const map = new Map<string, HostDisplayRef>();
  for (const result of toolResults) {
    walkForRefs(result, map, 0);
    if (result && typeof result === 'object' && 'data' in (result as object)) {
      walkForRefs((result as { data: unknown }).data, map, 0);
    }
  }
  for (const item of attachedContext) {
    upsertRef(map, {
      id: item.id,
      kind: attachedKindToEntity(item.type),
      label: item.label,
    });
  }
  return [...map.values()];
}

function findRefForToken(token: string, refs: HostDisplayRef[]): HostDisplayRef | undefined {
  const normalized = token.trim().toLowerCase();
  if (!normalized) return undefined;

  const exact = refs.find((ref) => ref.id.toLowerCase() === normalized);
  if (exact) return exact;

  if (normalized.length >= 4) {
    const partial = refs.filter(
      (ref) =>
        ref.id.toLowerCase().endsWith(normalized) || ref.id.toLowerCase().includes(normalized)
    );
    if (partial.length === 1) return partial[0];
  }

  return undefined;
}

export function isTechnicalBookingChipLabel(label: string): boolean {
  return TECHNICAL_BOOKING_LABEL_RE.test(label.trim());
}

function rowHostLabelFromTable(
  row: Record<string, string | number>,
  columns: string[]
): string | null {
  const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const valueFor = (slugs: string[]) => {
    for (const target of slugs) {
      const col = columns.find((c) => slug(c) === target);
      if (col) {
        const v = asDisplay(row[col]);
        if (v) return v;
      }
    }
    return '';
  };
  const guest = valueFor(['guest', 'guestname', 'name']);
  const checkIn = valueFor(['checkin', 'checkindate', 'arrival']);
  const checkOut = valueFor(['checkout', 'checkoutdate', 'departure']);
  const range = formatStayRangeShort(checkIn, checkOut);
  if (guest && range) return `${guest} · ${range}`;
  if (guest) return guest;
  return null;
}

/** Infer host labels from booking cards / tables already in the assistant answer. */
export function collectHostDisplayRefsFromBlocks(blocks: ChatBlock[]): HostDisplayRef[] {
  const refs: HostDisplayRef[] = [];
  for (const block of blocks) {
    if (block.type === 'booking_card') {
      const id = asDisplay(block.bookingId);
      if (!id) continue;
      refs.push({
        id,
        kind: 'booking',
        label: formatBookingHostLabel({
          guestName: block.guestName,
          checkIn: block.checkIn,
          checkOut: block.checkOut,
        }),
      });
      continue;
    }
    if (block.type === 'data_table') {
      const columns = block.columns ?? [];
      let index = 0;
      for (const row of block.rows ?? []) {
        const label = rowHostLabelFromTable(row, columns);
        if (!label) continue;
        const idCol = columns.find((c) => ID_COLUMN_RE.test(c.trim()));
        const id = idCol ? asDisplay(row[idCol]) : `table-row-${index}`;
        refs.push({ id: id || `table-row-${index}`, kind: 'booking', label });
        index += 1;
      }
    }
  }
  return refs;
}

export function mergeHostDisplayRefs(...groups: HostDisplayRef[][]): HostDisplayRef[] {
  const map = new Map<string, HostDisplayRef>();
  for (const group of groups) {
    for (const ref of group) upsertRef(map, ref);
  }
  return [...map.values()];
}

export function isTechnicalEntityLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  if (TECHNICAL_BOOKING_LABEL_RE.test(trimmed)) return true;
  if (/^[0-9a-f-]{8,}$/i.test(trimmed)) return true;
  if (/^\d{3,}$/.test(trimmed)) return true;
  return false;
}

function preserveActionPrefix(original: string, hostLabel: string): string {
  const match = original.match(/^(mark|complete|advance|open|view|show|select)\s+/i);
  if (match) return `${match[0].trim()} — ${hostLabel}`;
  return hostLabel;
}

/** Replace UUIDs and "Booking 4727"-style tokens with host labels. */
export function rewriteTextWithHostRefs(text: string, refs: HostDisplayRef[]): string {
  if (!text.trim() || refs.length === 0) return text;

  let out = text;
  for (const ref of refs) {
    if (ref.id.length < 8) continue;
    out = out.replace(new RegExp(ref.id, 'gi'), ref.label);
  }

  out = out.replace(BOOKING_TOKEN_IN_TEXT_RE, (full, token: string) => {
    const ref = findRefForToken(token, refs);
    return ref ? ref.label : full;
  });

  return out.replace(/\s{2,}/g, ' ').trim();
}

function humanizeEntityLabel(label: string, refs: HostDisplayRef[]): string {
  const trimmed = label.trim();
  if (!isTechnicalEntityLabel(trimmed)) return trimmed;

  const tokenMatch = trimmed.match(/([\da-f-]{4,})$/i);
  if (tokenMatch) {
    const ref = findRefForToken(tokenMatch[1], refs);
    if (ref) return preserveActionPrefix(trimmed, ref.label);
  }

  const uuidMatch = trimmed.match(UUID_RE);
  if (uuidMatch) {
    const ref = refs.find((r) => r.id.toLowerCase() === uuidMatch[0].toLowerCase());
    if (ref) return preserveActionPrefix(trimmed, ref.label);
  }

  return trimmed;
}

/**
 * Never leave "Booking 4069"-style chips in the UI.
 * Prefer mapping to real stays from tool results; otherwise drop the chip.
 */
export function humanizeQuickActions(
  actions: Array<{ label: string; prompt: string }>,
  refs: HostDisplayRef[]
): Array<{ label: string; prompt: string }> {
  if (actions.length === 0) return actions;

  const bookingRefs = refs.filter(
    (ref) => ref.kind === 'booking' || ref.kind === 'parking_booking'
  );
  const technicalCount = actions.filter((action) =>
    isTechnicalBookingChipLabel(action.label)
  ).length;
  const mostlyTechnical = technicalCount > 0 && technicalCount >= Math.ceil(actions.length / 2);

  // Model invented numeric booking chips — rebuild from real stays when we have them.
  if (mostlyTechnical && bookingRefs.length > 0) {
    const count = Math.min(Math.max(actions.length, 1), Math.min(bookingRefs.length, 5));
    return bookingRefs.slice(0, count).map((ref) => {
      const guest = ref.label.split(' · ')[0] || ref.label;
      return {
        label: ref.label,
        prompt:
          `Help me complete ${guest}'s booking. If Completed is not allowed yet, explain why, ` +
          `what is still pending, and the next valid step — do not say the booking is missing.`,
      };
    });
  }

  const out: Array<{ label: string; prompt: string }> = [];
  for (const [index, action] of actions.entries()) {
    if (isTechnicalBookingChipLabel(action.label)) {
      const token = action.label.match(/([\da-f-]{4,})$/i)?.[1];
      const ref = (token ? findRefForToken(token, bookingRefs) : undefined) ?? bookingRefs[index];
      if (ref) {
        out.push({
          label: ref.label,
          prompt: rewriteTextWithHostRefs(sanitizeQuickActionPrompt(action.prompt), refs),
        });
      }
      // Unresolvable technical chip — drop it (never show raw IDs).
      continue;
    }

    const label = humanizeEntityLabel(action.label, refs);
    if (isTechnicalEntityLabel(label)) continue;
    out.push({
      label,
      prompt: rewriteTextWithHostRefs(sanitizeQuickActionPrompt(action.prompt), refs),
    });
  }
  return out;
}

function enrichBookingCard(
  block: Extract<ChatBlock, { type: 'booking_card' }>,
  refs: HostDisplayRef[]
): Extract<ChatBlock, { type: 'booking_card' }> {
  const ref = refs.find(
    (r) => (r.kind === 'booking' || r.kind === 'parking_booking') && r.id === block.bookingId
  );
  if (!ref) return block;

  const guestName = asDisplay(block.guestName) || ref.label.split(' · ')[0] || ref.label;
  return { ...block, guestName };
}

function humanizeDataTable(
  block: Extract<ChatBlock, { type: 'data_table' }>,
  refs: HostDisplayRef[]
): Extract<ChatBlock, { type: 'data_table' }> {
  const columns = block.columns ?? [];
  const idColumnIndex = columns.findIndex((col) => ID_COLUMN_RE.test(col.trim()));
  if (idColumnIndex < 0) return block;

  const rows = (block.rows ?? []).map((row) => {
    const next = { ...row };
    const idValue = asDisplay(next[columns[idColumnIndex]]);
    const ref = findRefForToken(idValue, refs) ?? refs.find((r) => r.id === idValue);
    if (ref) {
      next[columns[idColumnIndex]] = ref.label;
    }
    return next;
  });

  const nextColumns = [...columns];
  if (ID_COLUMN_RE.test(nextColumns[idColumnIndex]?.trim() ?? '')) {
    nextColumns[idColumnIndex] = 'Stay';
  }

  return { ...block, columns: nextColumns, rows };
}

/** Rewrite assistant blocks so labels, tables, and chips stay host-readable. */
export function humanizeBlocksForHost(blocks: ChatBlock[], refs: HostDisplayRef[]): ChatBlock[] {
  const mergedRefs = refs.length > 0 ? refs : collectHostDisplayRefsFromBlocks(blocks);
  if (mergedRefs.length === 0) return blocks;

  return blocks.map((block) => {
    if (block.type === 'text') {
      return {
        type: 'text',
        text: rewriteTextWithHostRefs(block.text, mergedRefs),
      };
    }
    if (block.type === 'quick_actions') {
      return {
        type: 'quick_actions',
        actions: humanizeQuickActions(block.actions ?? [], mergedRefs),
      };
    }
    if (block.type === 'booking_card') {
      return enrichBookingCard(block, mergedRefs);
    }
    if (block.type === 'data_table') {
      return humanizeDataTable(block, mergedRefs);
    }
    if (block.type === 'link_list') {
      return {
        ...block,
        links: (block.links ?? []).map((link) => ({
          ...link,
          label: rewriteTextWithHostRefs(link.label, mergedRefs),
        })),
      };
    }
    return block;
  });
}

function hasHostVisibleContent(blocks: ChatBlock[]): boolean {
  return blocks.some((block) => {
    if (block.type === 'activity_timeline' || block.type === 'task_plan') return false;
    if (block.type === 'quick_actions') return (block.actions?.length ?? 0) > 0;
    if (block.type === 'text') return Boolean(block.text?.trim());
    if (block.type === 'dynamic_form') return (block.fields?.length ?? 0) > 0;
    return true;
  });
}

function bookingSuggestionActions(
  bookingRefs: HostDisplayRef[]
): Array<{ label: string; prompt: string }> {
  return bookingRefs.slice(0, 5).map((ref) => {
    const guest = ref.label.split(' · ')[0] || ref.label;
    const statusPart = ref.label.includes(' · ') ? ref.label.split(' · ').slice(-1)[0] : '';
    return {
      label: ref.label,
      prompt:
        `Help me complete ${guest}'s booking` +
        (statusPart ? ` (currently ${statusPart})` : '') +
        `. If Completed is not allowed yet, explain why, what is still pending, and the next valid step — do not say the booking is missing.`,
    };
  });
}

/**
 * Last pass before persisting:
 * 1) Rewrite "Booking ####" chips to guest · dates when we know the stays
 * 2) Drop unresolved technical chips and echo chips (same label the host just sent)
 * 3) Never leave an empty answer (timeline-only) — inject a short pick-entity reply
 */
export function finalizeAssistantBlocksForHost(
  blocks: ChatBlock[],
  toolResults: unknown[],
  attachedContext: AttachedContextItem[] = [],
  options?: { userMessage?: string | null }
): ChatBlock[] {
  const refs = mergeHostDisplayRefs(
    collectHostDisplayRefs(toolResults, attachedContext),
    collectHostDisplayRefsFromBlocks(blocks)
  );
  const bookingRefs = refs.filter(
    (ref) => ref.kind === 'booking' || ref.kind === 'parking_booking'
  );
  const attachedEchoLabels = attachedContext.map((item) => item.label).filter(Boolean);

  let next: ChatBlock[] = humanizeBlocksForHost(blocks, refs).flatMap((block): ChatBlock[] => {
    if (block.type !== 'quick_actions') return [block];
    const actions = filterEchoSuggestionChips(humanizeQuickActions(block.actions ?? [], refs), {
      userMessage: options?.userMessage,
      echoLabels: attachedEchoLabels,
    });
    if (actions.length === 0) return [];
    return [{ type: 'quick_actions', actions }];
  });

  // Model invented numeric chips and we have real stays — ensure suggestions exist.
  const hasJourneyUi = next.some((block) => block.type === 'stepper');
  const hasQuickActions = next.some((block) => block.type === 'quick_actions');
  if (!hasQuickActions && !hasJourneyUi && bookingRefs.length > 0) {
    const hadTechnicalChips = blocks.some(
      (block) =>
        block.type === 'quick_actions' &&
        (block.actions ?? []).some((action) => isTechnicalBookingChipLabel(action.label))
    );
    if (hadTechnicalChips) {
      next.push({ type: 'quick_actions', actions: bookingSuggestionActions(bookingRefs) });
    }
  }

  if (!hasHostVisibleContent(next)) {
    if (hasJourneyUi) {
      next.push({
        type: 'text',
        text: 'Use the journey above to work through the next step.',
      });
    } else if (bookingRefs.length > 0) {
      next.push({
        type: 'text',
        text: 'Which stay should I advance? Pick one below.',
      });
      next.push({ type: 'quick_actions', actions: bookingSuggestionActions(bookingRefs) });
    } else if (refs.length > 0) {
      next.push({
        type: 'text',
        text: 'Which one should I use? Pick a suggestion below, or name it.',
      });
      next.push({
        type: 'quick_actions',
        actions: refs.slice(0, 5).map((ref) => ({
          label: ref.label,
          prompt: `Continue with ${ref.label}. Look it up with the right list/get tool for this module and take the next useful step — do not say it is missing if tools already returned it.`,
        })),
      });
    } else {
      next.push({
        type: 'text',
        text: 'Which record should I use? Pin one in the composer, or tell me the name.',
      });
    }
  }

  return next;
}

/** Stable sort key for disambiguation lists — check-in ascending when present. */
export function bookingHostLabelSortKey(checkIn: string | null | undefined): string {
  return normalizeDateToYYYYMMDD(asDisplay(checkIn)) || '9999-12-31';
}
