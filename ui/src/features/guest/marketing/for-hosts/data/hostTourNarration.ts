/** Per-chapter voiceover lines for the Remotion host dashboard tour. */
export const HOST_TOUR_NARRATION_PUBLIC_DIR = '/marketing/for-hosts/narration';

export const hostTourNarration = [
  {
    id: 'command-center',
    text: 'See stays, revenue, and today’s work in one calm command center.',
  },
  {
    id: 'booking-workflow',
    text: 'Watch each booking move from review to ready for check-in, automatically.',
  },
  {
    id: 'guest-inbox',
    text: 'Guest messages land here, and AI drafts a reply you can send.',
  },
  {
    id: 'finance',
    text: 'Follow income, expenses, and net profit as every stay settles.',
  },
  {
    id: 'pricing',
    text: 'Tune weekday, weekend, and date rates directly on the calendar.',
  },
  {
    id: 'marketing-studio',
    text: 'Plan, design, edit, and schedule your property content in one studio.',
  },
  {
    id: 'maintenance',
    text: 'Keep recurring upkeep scheduled, tracked, and marked done.',
  },
  {
    id: 'notifications',
    text: 'Telegram routes the right reminder to the right team, instantly.',
  },
  {
    id: 'ai-assistant',
    text: 'Receipts, approvals, and replies — AI handles the repetition for you.',
  },
] as const;

export type HostTourNarrationId = (typeof hostTourNarration)[number]['id'];

export function hostTourNarrationAudioSrc(id: string): string {
  return `${HOST_TOUR_NARRATION_PUBLIC_DIR}/${id}.mp3`;
}
