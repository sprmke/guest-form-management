export type TelegramPlaceholderItem = {
  token: string;
  description: string;
  group: string;
};

const GROUP_ORDER = [
  'Guest',
  'Stay',
  'Booking',
  'Flags',
  'Workflow',
  'Payments',
  'SD refund',
  'Calendar',
  'Summary',
  'Other',
] as const;

/** Operations placeholders — API returns tokens only; descriptions live client-side. */
const ADMIN_PLACEHOLDER_META: Record<
  string,
  { group: (typeof GROUP_ORDER)[number]; description: string }
> = {
  primary_guest_name: { group: 'Guest', description: 'Primary guest full name' },
  guest_phone: { group: 'Guest', description: 'Guest phone number' },
  guest_email: { group: 'Guest', description: 'Guest email address' },
  guest_address: { group: 'Guest', description: 'Guest home address' },
  guest_facebook_name: { group: 'Guest', description: 'Facebook / Airbnb name' },
  booking_source: { group: 'Booking', description: 'Source (e.g. Facebook, Airbnb)' },
  tower_and_unit_number: { group: 'Booking', description: 'Tower and unit number' },
  booking_link: { group: 'Booking', description: 'Admin booking detail URL' },
  urgent_notice: { group: 'Workflow', description: 'Urgent banner when applicable' },
  check_in_date: { group: 'Stay', description: 'Check-in date' },
  check_out_date: { group: 'Stay', description: 'Check-out date' },
  check_in_time: { group: 'Stay', description: 'Check-in time' },
  check_out_time: { group: 'Stay', description: 'Check-out time' },
  nights: { group: 'Stay', description: 'Number of nights' },
  pax: { group: 'Stay', description: 'Guest count (adults + children)' },
  need_parking: { group: 'Flags', description: 'Whether parking was requested' },
  has_pets: { group: 'Flags', description: 'Whether pets were declared' },
  surprise_decor: { group: 'Flags', description: 'Whether surprise decor was requested' },
  status: { group: 'Workflow', description: 'Booking status code' },
  status_label: { group: 'Workflow', description: 'Human-readable status label' },
  pending_docs_list: { group: 'Workflow', description: 'Incomplete GAF, parking, or pet steps' },
  total_guest_balance: { group: 'Payments', description: 'Total guest balance due (₱ formatted)' },
  sd_refund_method: { group: 'SD refund', description: 'Guest-selected refund method' },
  sd_refund_bank: { group: 'SD refund', description: 'Refund bank name' },
  sd_refund_account_name: { group: 'SD refund', description: 'Refund account holder name' },
  sd_refund_account_number: { group: 'SD refund', description: 'Refund account number' },
  sd_refund_payout_phone: { group: 'SD refund', description: 'GCash / payout phone' },
  sd_refund_details: { group: 'SD refund', description: 'Extra refund instructions from guest' },
  sd_refund_guest_feedback: { group: 'SD refund', description: 'Guest feedback from SD form' },
};

/** Marketing calendar placeholders — fallback when API line has no em-dash description. */
const MARKETING_PLACEHOLDER_META: Record<
  string,
  { group: (typeof GROUP_ORDER)[number]; description: string }
> = {
  available_dates: {
    group: 'Calendar',
    description: 'Free check-in dates (e.g. June 18, 19, 20)',
  },
  month_name: {
    group: 'Calendar',
    description: 'Current month name only (e.g. June)',
  },
  dates_list: {
    group: 'Calendar',
    description: 'Free check-in day numbers this month (e.g. 18, 19, 20)',
  },
  cancellation_dates: {
    group: 'Calendar',
    description: 'Freed stay window (e.g. June 18–19)',
  },
};

function tokenName(token: string): string {
  return token.replace(/^\{\{|\}\}$/g, '').trim();
}

function inferGroupFromToken(name: string): (typeof GROUP_ORDER)[number] {
  if (/^(primary_guest|guest_)/.test(name)) return 'Guest';
  if (/^(check_in|check_out|nights|pax)$/.test(name)) return 'Stay';
  if (/^(available_dates|month_name|dates_list|cancellation_dates)$/.test(name)) {
    return 'Calendar';
  }
  if (/^(decor_|pet_|has_decor|has_pets|special_requests)/.test(name)) return 'Flags';
  if (/^(next_bookings|total_guest)/.test(name)) return 'Summary';
  if (/^sd_refund_/.test(name)) return 'SD refund';
  if (/^(status|pending_docs|urgent_)/.test(name)) return 'Workflow';
  return 'Other';
}

function parsePlaceholderLine(line: string): { token: string; description?: string } {
  const trimmed = line.trim();
  const rich = trimmed.match(/^(\{\{[^}]+\}\})\s*[—–-]\s*(.+)$/);
  if (rich) {
    return { token: rich[1], description: rich[2].trim() };
  }
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
    return { token: trimmed };
  }
  return { token: trimmed };
}

export function buildValidPlaceholderKeySet(lines: string[]): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const line of lines) {
    const { token } = parsePlaceholderLine(line);
    const name = tokenName(token);
    if (name) keys.add(name);
  }
  return keys;
}

export function enrichPlaceholderLines(lines: string[]): TelegramPlaceholderItem[] {
  return lines.map((line) => {
    const { token, description } = parsePlaceholderLine(line);
    const name = tokenName(token);
    const adminMeta = ADMIN_PLACEHOLDER_META[name];
    if (adminMeta) {
      return {
        token,
        description: description ?? adminMeta.description,
        group: adminMeta.group,
      };
    }
    const marketingMeta = MARKETING_PLACEHOLDER_META[name];
    if (marketingMeta) {
      return {
        token,
        description: description ?? marketingMeta.description,
        group: marketingMeta.group,
      };
    }
    return {
      token,
      description: description ?? 'Available in this bot’s templates',
      group: inferGroupFromToken(name),
    };
  });
}

export function groupPlaceholders(
  items: TelegramPlaceholderItem[],
): Array<{ group: string; items: TelegramPlaceholderItem[] }> {
  const map = new Map<string, TelegramPlaceholderItem[]>();
  for (const item of items) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  const ordered: Array<{ group: string; items: TelegramPlaceholderItem[] }> =
    GROUP_ORDER.filter((g) => map.has(g)).map((group) => ({
      group,
      items: map.get(group)!,
    }));
  for (const [group, groupItems] of map) {
    if (!(GROUP_ORDER as readonly string[]).includes(group)) {
      ordered.push({ group, items: groupItems });
    }
  }
  return ordered;
}

export function filterPlaceholders(
  items: TelegramPlaceholderItem[],
  query: string,
): TelegramPlaceholderItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.token.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q),
  );
}
