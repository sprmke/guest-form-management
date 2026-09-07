import { formatDistanceToNowStrict } from 'date-fns';

import type { ActivityChange } from '@/features/dashboard/activity/lib/activityCatalog';

/** "3 min ago" style — for the row timestamp. */
export function activityRelativeTime(iso: string): string {
  try {
    return `${formatDistanceToNowStrict(new Date(iso))} ago`;
  } catch {
    return iso;
  }
}

/** Absolute Asia/Manila timestamp — for the tooltip / detail sheet. */
export function activityAbsoluteTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Human label for a machine `action` key — `booking.status_changed` → "Booking · status changed". */
export function humanizeAction(action: string): string {
  const [group, ...rest] = action.split('.');
  const verb = rest.join('.').replace(/_/g, ' ');
  return `${group.replace(/_/g, ' ')} · ${verb}`.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function changeSummary(changes: ActivityChange[] | null): string {
  if (!changes?.length) return '';
  const names = changes.map((c) => c.field.replace(/_/g, ' '));
  return names.length <= 3
    ? names.join(', ')
    : `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
}
