/**
 * Default org quick replies for common booking / Airbnb inquiries.
 * Seeded once per org when the template list is empty.
 */

import { socialInboxDb } from './socialInboxService.ts';

export type DefaultQuickReplySeed = {
  title: string;
  body_text: string;
  sort_order: number;
};

export const INBOX_DEFAULT_QUICK_REPLIES: DefaultQuickReplySeed[] = [
  {
    title: 'Availability',
    body_text:
      'You can check our available dates here: https://kamehomes.space — let me know your preferred check-in and check-out and I’ll confirm for you.',
    sort_order: 0,
  },
  {
    title: 'Rates',
    body_text:
      'Our nightly rate depends on dates and number of guests. Share your travel dates and pax and I’ll send the exact quote.',
    sort_order: 1,
  },
  {
    title: 'Check-in',
    body_text:
      'Check-in is from 2:00 PM and check-out is by 12:00 PM (Asia/Manila). Early check-in may be possible if the unit is ready — just ask.',
    sort_order: 2,
  },
  {
    title: 'Parking',
    body_text:
      'Parking is available on a paid basis. Let me know if you need a slot and for how many nights so we can reserve one for you.',
    sort_order: 3,
  },
  {
    title: 'Pets',
    body_text:
      'Pets may be allowed with prior approval and an additional pet fee. Please share your pet details (type, size, count) and we’ll confirm.',
    sort_order: 4,
  },
  {
    title: 'Location',
    body_text:
      'We’re in Azure North, San Fernando, Pampanga. I can send the exact unit address and map pin once your dates are confirmed.',
    sort_order: 5,
  },
  {
    title: 'Amenities',
    body_text:
      'The unit includes Wi‑Fi, air conditioning, kitchen basics, and linens. Tell me what you need and I’ll confirm what’s in your unit.',
    sort_order: 6,
  },
  {
    title: 'How to book',
    body_text:
      'To book: pick your dates on our calendar, fill out the guest form, and send your down payment receipt. I’ll guide you through each step.',
    sort_order: 7,
  },
  {
    title: 'Payment',
    body_text:
      'We accept GCash for down payment and balance. I’ll send payment details and the amount breakdown after we confirm your dates.',
    sort_order: 8,
  },
  {
    title: 'Follow-up',
    body_text:
      'Thanks for reaching out! Let me know if you have any other questions — happy to help with your stay.',
    sort_order: 9,
  },
];

export async function seedDefaultInboxQuickRepliesIfEmpty(orgId: string): Promise<number> {
  const sb = socialInboxDb();
  const { count, error: countError } = await sb
    .from('social_reply_templates')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) return 0;

  const rows = INBOX_DEFAULT_QUICK_REPLIES.map((t) => ({
    organization_id: orgId,
    title: t.title,
    body_text: t.body_text,
    platform: null,
    conversation_type: 'all',
    sort_order: t.sort_order,
    is_active: true,
  }));

  const { error } = await sb.from('social_reply_templates').insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}
