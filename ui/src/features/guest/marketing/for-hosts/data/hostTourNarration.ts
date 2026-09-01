/** Per-chapter voiceover lines for the Remotion host dashboard tour. */
export const HOST_TOUR_NARRATION_PUBLIC_DIR = '/marketing/for-hosts/narration';

export const hostTourNarration = [
  {
    id: 'portfolio',
    text: 'Every property and parking listing lives in one workspace, with revenue and occupancy rolled up across your whole organization.',
  },
  {
    id: 'command-center',
    text: 'Each property opens on a calm command center: this month’s profit, occupancy, the calendar, and exactly what needs your attention today.',
  },
  {
    id: 'booking-workflow',
    text: 'Every booking moves down one visible pipeline. Documents, receipt checks, calendar updates, and guest emails happen automatically as it advances.',
  },
  {
    id: 'bookings-board',
    text: 'Prefer a board? Drag a stay from one stage to the next, or add a walk-in or phone booking straight from the dashboard.',
  },
  {
    id: 'data-import',
    text: 'Already running bookings elsewhere? Upload any spreadsheet and AI maps your columns to the right fields, flagging only the rows that need a second look.',
  },
  {
    id: 'channel-sync',
    text: 'Airbnb sync runs both ways: their reservations arrive as bookings to review, and every blocked or booked night is pushed straight back to Airbnb.',
  },
  {
    id: 'pricing',
    text: 'Set weekday, weekend, and single-night rates right on the calendar, block dates in a tap, and see every booked night in place.',
  },
  {
    id: 'finance',
    text: 'Booking income lands on its own. Add expenses, watch net profit update, and export a clean report for any date range.',
  },
  {
    id: 'maintenance',
    text: 'Keep recurring upkeep scheduled, tracked, and marked done, with Telegram reminders and a report you can hand to your team.',
  },
  {
    id: 'guest-inbox',
    text: 'Website chat, Facebook, and Instagram share one inbox. Review an AI-drafted reply before you send it, or switch on auto-reply and let it answer instantly.',
  },
  {
    id: 'ai-receptionist',
    text: 'Guests can call and talk to Kame, your animated voice receptionist. It listens, answers from your property’s own details, and saves the transcript.',
  },
  {
    id: 'marketing-studio',
    text: 'The Content Studio has three builders: an availability calendar, social graphics, and short videos. Style them with AI, then publish to Facebook and Instagram.',
  },
  {
    id: 'public-pages',
    text: 'Edit your public listing, stay guide, and showcase page section by section, with a live preview updating beside you as you type.',
  },
  {
    id: 'templates',
    text: 'Tune every guest email and stay-guide section with placeholders, preview exactly what guests receive, and reset any template to default.',
  },
  {
    id: 'team',
    text: 'Invite your team and give each person the right access: Full Access, Operations, Read Only, or a custom role you define.',
  },
  {
    id: 'notifications',
    text: 'Route chat, marketing, staff, operations, finance, and maintenance alerts to the right Telegram group, delivered the moment something happens.',
  },
  {
    id: 'plans-billing',
    text: 'Plans are priced per property, with volume discounts as you grow, and one bill that covers every property in the organization.',
  },
  {
    id: 'ai-assistant',
    text: 'Ask the dashboard assistant anything. It answers from your live numbers, pulls in a booking or property for context, and takes you straight to the page.',
  },
  {
    id: 'help-support',
    text: 'Help and Support brings together FAQs, a guide for every page, product updates, and support tickets you can track right from your dashboard.',
  },
] as const;

export type HostTourNarrationId = (typeof hostTourNarration)[number]['id'];

export function hostTourNarrationAudioSrc(id: string): string {
  return `${HOST_TOUR_NARRATION_PUBLIC_DIR}/${id}.mp3`;
}
