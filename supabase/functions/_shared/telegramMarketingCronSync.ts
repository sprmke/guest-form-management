/** Manila +08 clock → pg_cron uses UTC (`minute hour * * *`). No DST for Asia/Manila. */

export type ManilaReminderSlot = { hour: number; minute: number };

/** Default 10 / 15 / 21 Manila (matches historical fixed cron defaults). */
export const DEFAULT_MANILA_REMINDER_SLOTS: ManilaReminderSlot[] = [
  { hour: 10, minute: 0 },
  { hour: 15, minute: 0 },
  { hour: 21, minute: 0 },
];

export function manilaTimeToUtcCronParts(slot: ManilaReminderSlot): { utcH: number; utcM: number } {
  const M = slot.hour * 60 + slot.minute;
  const U = (M - 480 + 2880) % 1440;
  return { utcH: Math.floor(U / 60) % 24, utcM: U % 60 };
}

/** Human-readable cron expression for Postgres pg_cron (daily). */
export function manilaSlotsToUtcCronPreview(slots: ManilaReminderSlot[]): string[] {
  return slots.map((s) => {
    const { utcH, utcM } = manilaTimeToUtcCronParts(s);
    return `${utcM} ${utcH} * * *`;
  });
}

const MAX_SLOTS = 8;

function slotKey(h: number, m: number): number {
  return h * 60 + m;
}

/** Validate + normalize; throws message for client. */
export function parseManilaReminderSlots(input: unknown): ManilaReminderSlot[] {
  if (!Array.isArray(input)) {
    throw new Error('dailyReminderTimesManila must be an array of { hour, minute }');
  }
  if (input.length < 1) {
    throw new Error('Provide at least one daily reminder time (Asia/Manila)');
  }
  if (input.length > MAX_SLOTS) {
    throw new Error(`At most ${MAX_SLOTS} daily reminder times`);
  }
  const raw: ManilaReminderSlot[] = [];
  for (const entry of input) {
    if (entry === null || typeof entry !== 'object') {
      throw new Error('Each slot must be an object with integer hour (0–23) and minute (0–59)');
    }
    const o = entry as Record<string, unknown>;
    let h =
      typeof o.hour === 'number' && Number.isInteger(o.hour) ? (o.hour as number) : NaN;
    let m =
      typeof o.minute === 'number' && Number.isInteger(o.minute)
        ? (o.minute as number)
        : NaN;
    if (Number.isNaN(h) && typeof o.h === 'number' && Number.isInteger(o.h)) h = o.h as number;
    if (Number.isNaN(m) && typeof o.m === 'number' && Number.isInteger(o.m)) m = o.m as number;

    if (Number.isNaN(h) || h < 0 || h > 23 || Number.isNaN(m) || m < 0 || m > 59) {
      throw new Error('Each slot needs hour 0–23 and minute 0–59');
    }
    raw.push({ hour: h, minute: m });
  }
  raw.sort((a, b) => slotKey(a.hour, a.minute) - slotKey(b.hour, b.minute));
  const deduped: ManilaReminderSlot[] = [];
  const seen = new Set<number>();
  for (const s of raw) {
    const k = slotKey(s.hour, s.minute);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(s);
  }
  if (deduped.length < 1) {
    throw new Error('Provide at least one unique daily reminder time');
  }
  return deduped;
}
