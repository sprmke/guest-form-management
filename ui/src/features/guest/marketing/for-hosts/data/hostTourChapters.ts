import {
  BellRing,
  BarChart3,
  Bot,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  LayoutDashboard,
  MessagesSquare,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import {
  hostTourNarration,
  hostTourNarrationAudioSrc,
} from '@/features/guest/marketing/for-hosts/data/hostTourNarration';

export const HOST_TOUR_FPS = 30;
export const HOST_TOUR_CHAPTER_SECONDS = 6;
export const HOST_TOUR_CHAPTER_FRAMES = HOST_TOUR_FPS * HOST_TOUR_CHAPTER_SECONDS;

export interface HostTourChapter {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  narration: string;
  audioSrc: string;
  icon: LucideIcon;
}

const chapterMeta = [
  {
    id: 'command-center',
    label: 'Overview',
    eyebrow: 'Command center',
    title: 'See the whole operation at a glance',
    description: 'Live stays, revenue, occupancy, tasks, and guest activity in one calm workspace.',
    icon: LayoutDashboard,
  },
  {
    id: 'booking-workflow',
    label: 'Bookings',
    eyebrow: 'Automated booking flow',
    title: 'Move every stay forward without loose ends',
    description:
      'Documents, pricing, calendar updates, and guest emails follow one visible pipeline.',
    icon: ClipboardCheck,
  },
  {
    id: 'guest-inbox',
    label: 'Inbox',
    eyebrow: 'Unified guest inbox',
    title: 'Reply faster with AI beside your team',
    description:
      'Bring guest conversations together and turn suggested replies into polished answers.',
    icon: MessagesSquare,
  },
  {
    id: 'finance',
    label: 'Finance',
    eyebrow: 'Finance and reporting',
    title: 'Know what each stay actually earns',
    description:
      'Follow cash flow, expenses, pending payments, and property performance in real time.',
    icon: CircleDollarSign,
  },
  {
    id: 'pricing',
    label: 'Pricing',
    eyebrow: 'Nightly pricing',
    title: 'Tune rates directly on the calendar',
    description:
      'Set weekday, weekend, and date-specific rates with booked nights already in view.',
    icon: CalendarDays,
  },
  {
    id: 'marketing-studio',
    label: 'Marketing',
    eyebrow: 'Marketing Studio',
    title: 'Create and schedule content in one flow',
    description:
      'Plan posts, shape visuals, edit short videos, and keep the publishing calendar moving.',
    icon: Sparkles,
  },
  {
    id: 'maintenance',
    label: 'Operations',
    eyebrow: 'Maintenance',
    title: 'Turn recurring upkeep into a routine',
    description:
      'Schedule property work, track completion, and keep upcoming tasks from being missed.',
    icon: BarChart3,
  },
  {
    id: 'notifications',
    label: 'Alerts',
    eyebrow: 'Telegram notifications',
    title: 'Send the right reminder to the right team',
    description:
      'Route marketing, finance, operations, staff, and maintenance alerts automatically.',
    icon: BellRing,
  },
  {
    id: 'ai-assistant',
    label: 'AI',
    eyebrow: 'AI assistant',
    title: 'Let automation handle the repetitive checks',
    description:
      'Validate receipts, reconcile approvals, and prepare replies while you stay in control.',
    icon: Bot,
  },
] as const;

const narrationById = Object.fromEntries(hostTourNarration.map((line) => [line.id, line.text]));

export const hostTourChapters: HostTourChapter[] = chapterMeta.map((chapter) => {
  const narration = narrationById[chapter.id];
  if (!narration) {
    throw new Error(`Missing narration for host tour chapter "${chapter.id}"`);
  }
  return {
    ...chapter,
    narration,
    audioSrc: hostTourNarrationAudioSrc(chapter.id),
  };
});

export const HOST_TOUR_DURATION_IN_FRAMES = hostTourChapters.length * HOST_TOUR_CHAPTER_FRAMES;
