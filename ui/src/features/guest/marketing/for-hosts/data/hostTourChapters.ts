import {
  Bell,
  BookOpen,
  Bot,
  Building2,
  CalendarClock,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  PhoneCall,
  Sparkles,
  Tags,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import {
  hostTourNarration,
  hostTourNarrationAudioSrc,
} from '@/features/guest/marketing/for-hosts/data/hostTourNarration';

export const HOST_TOUR_FPS = 30;

/** Legacy uniform fallback — kept only for reduced-motion hold math when a chapter has no duration. */
export const HOST_TOUR_CHAPTER_FRAMES = 180;

/**
 * Narration for each chapter starts this many frames after the chapter begins, so the
 * incoming transition has finished and the previous chapter's voice line has ended — no
 * two feature lines ever overlap.
 */
export const HOST_TOUR_NARRATION_START_DELAY = 14;

export type HostTourTransitionType = 'dissolve' | 'slide' | 'push';

export interface HostTourChapter {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  narration: string;
  audioSrc: string;
  icon: LucideIcon;
  /** Scene length in frames (variable pacing). */
  durationInFrames: number;
  /** Overlap (in frames) of the transition that plays *entering* this chapter. 0 for the first. */
  transitionInFrames: number;
  transitionType: HostTourTransitionType;
}

type ChapterMeta = Omit<HostTourChapter, 'narration' | 'audioSrc'>;

const S = HOST_TOUR_FPS;
const DISSOLVE = 15;
const PUSH = 20;

const chapterMeta: ChapterMeta[] = [
  {
    id: 'portfolio',
    label: 'Portfolio',
    eyebrow: 'Organization workspace',
    title: 'Run every property and parking listing in one place',
    description:
      'Switch listings, see revenue and occupancy across the whole organization, add a property or parking slot.',
    icon: Building2,
    durationInFrames: 8 * S,
    transitionInFrames: 0,
    transitionType: 'dissolve',
  },
  {
    id: 'command-center',
    label: 'Overview',
    eyebrow: 'Property command center',
    title: 'See the whole operation at a glance',
    description:
      'Live stays, revenue, occupancy, tasks, and guest activity for one property in a calm workspace.',
    icon: LayoutDashboard,
    durationInFrames: 8 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'booking-workflow',
    label: 'Bookings',
    eyebrow: 'Automated booking flow',
    title: 'Move every stay forward without loose ends',
    description:
      'Documents, receipt checks, pricing, calendar updates, and guest emails follow one visible pipeline.',
    icon: BookOpen,
    durationInFrames: 12 * S,
    transitionInFrames: PUSH,
    transitionType: 'push',
  },
  {
    id: 'bookings-board',
    label: 'Board',
    eyebrow: 'Work bookings your way',
    title: 'Drag a stay forward, or add one by hand',
    description:
      'A kanban board you drag between stages, plus an in-dashboard booking form for walk-ins and calls.',
    icon: BookOpen,
    durationInFrames: 9 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'data-import',
    label: 'AI import',
    eyebrow: 'AI-assisted data import',
    title: 'Bring your existing bookings in — AI maps the columns',
    description:
      'Upload any spreadsheet; AI matches your headers to the right fields and flags only the rows that need a look.',
    icon: Sparkles,
    durationInFrames: 10 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'channel-sync',
    label: 'Airbnb sync',
    eyebrow: 'Two-way Airbnb calendar sync',
    title: 'Airbnb and Kame, always in step',
    description:
      'Airbnb reservations flow in as bookings to review; your blocked and booked nights flow back out to Airbnb.',
    icon: CalendarClock,
    durationInFrames: 10 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    eyebrow: 'Nightly pricing',
    title: 'Tune rates directly on the calendar',
    description:
      'Set weekday, weekend, and date-specific rates with booked nights and blocked dates in view.',
    icon: Tags,
    durationInFrames: 8 * S,
    transitionInFrames: PUSH,
    transitionType: 'push',
  },
  {
    id: 'finance',
    label: 'Finance',
    eyebrow: 'Finance and reporting',
    title: 'Know what each stay actually earns',
    description:
      'Booking income lands automatically; add expenses, follow net profit, and export a report.',
    icon: DollarSign,
    durationInFrames: 9 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    eyebrow: 'Recurring upkeep',
    title: 'Turn recurring upkeep into a routine',
    description:
      'Schedule property work, track completion, keep upcoming tasks from being missed, and export it.',
    icon: Wrench,
    durationInFrames: 8 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'guest-inbox',
    label: 'Inbox',
    eyebrow: 'Unified guest inbox',
    title: 'AI suggests the reply — or sends it for you',
    description:
      'Website chat, Facebook, and Instagram in one place: review an AI-drafted reply, or let it answer on its own.',
    icon: Inbox,
    durationInFrames: 13 * S,
    transitionInFrames: PUSH,
    transitionType: 'push',
  },
  {
    id: 'ai-receptionist',
    label: 'Receptionist',
    eyebrow: 'AI voice receptionist',
    title: 'Meet Kame — your guests’ voice receptionist',
    description:
      'Guests hold a live voice call with your animated AI receptionist, answered from your property’s own details.',
    icon: PhoneCall,
    durationInFrames: 12 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'marketing-studio',
    label: 'Marketing',
    eyebrow: 'Marketing Content Studio',
    title: 'Calendars, graphics, and videos in one studio',
    description:
      'Switch between Calendar, Design, and Video builders, style with AI, then publish to Facebook and Instagram.',
    icon: Megaphone,
    durationInFrames: 12 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'public-pages',
    label: 'Public Pages',
    eyebrow: 'Public pages editor',
    title: 'Edit your listing with a live preview',
    description:
      'Pick a section, edit the content, watch the guest-facing listing, stay guide, or showcase update as you type.',
    icon: Globe,
    durationInFrames: 10 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'templates',
    label: 'Templates',
    eyebrow: 'Template management',
    title: 'Edit every message — and preview it first',
    description:
      'Stay-guide sections and automated emails, each with placeholders, a live preview, and reset-to-default.',
    icon: FileText,
    durationInFrames: 9 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'team',
    label: 'Team',
    eyebrow: 'Team and roles',
    title: 'Bring people in with the right access',
    description:
      'Invite teammates, pick Full Access, Operations, or Read Only, or build a custom role.',
    icon: Users,
    durationInFrames: 8 * S,
    transitionInFrames: PUSH,
    transitionType: 'push',
  },
  {
    id: 'notifications',
    label: 'Alerts',
    eyebrow: 'Telegram notifications',
    title: 'Send the right reminder to the right team',
    description:
      'Route chat, marketing, staff, operations, finance, and maintenance alerts to Telegram automatically.',
    icon: Bell,
    durationInFrames: 9 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'plans-billing',
    label: 'Plans',
    eyebrow: 'Plans and billing',
    title: 'Pick a plan priced per property',
    description:
      'Compare tiers feature by feature; billing covers every property in the organization at once.',
    icon: CreditCard,
    durationInFrames: 9 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
  {
    id: 'ai-assistant',
    label: 'AI assistant',
    eyebrow: 'AI dashboard assistant',
    title: 'Ask your dashboard anything',
    description:
      'Answers from live data, attaches a booking or property for context, and jumps you straight to the page.',
    icon: Bot,
    durationInFrames: 11 * S,
    transitionInFrames: PUSH,
    transitionType: 'push',
  },
  {
    id: 'help-support',
    label: 'Help',
    eyebrow: 'Help & Support',
    title: 'FAQs, guides, updates, and a line to our team',
    description:
      'FAQs, per-page guides, product announcements, Ask AI, and support tickets tracked from your dashboard.',
    icon: LifeBuoy,
    durationInFrames: 9 * S,
    transitionInFrames: DISSOLVE,
    transitionType: 'dissolve',
  },
];

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

/** Per-chapter scene length, in frames. */
export const HOST_TOUR_CHAPTER_DURATIONS: number[] = hostTourChapters.map(
  (chapter) => chapter.durationInFrames
);

/** Per-chapter entering-transition overlap, in frames (index 0 is 0). */
export const HOST_TOUR_CHAPTER_TRANSITIONS: number[] = hostTourChapters.map(
  (chapter) => chapter.transitionInFrames
);

/**
 * Cumulative start frame of each chapter on the composition timeline, accounting for
 * `TransitionSeries` overlap: `start[i] = start[i-1] + duration[i-1] - transition[i]`.
 */
export const HOST_TOUR_CHAPTER_STARTS: number[] = hostTourChapters.reduce<number[]>(
  (starts, chapter, index) => {
    if (index === 0) {
      starts.push(0);
      return starts;
    }
    const previousStart = starts[index - 1];
    const previousDuration = hostTourChapters[index - 1].durationInFrames;
    starts.push(previousStart + previousDuration - chapter.transitionInFrames);
    return starts;
  },
  []
);

/** Total composition length: sum of scene durations minus all transition overlaps. */
export const HOST_TOUR_DURATION_IN_FRAMES =
  HOST_TOUR_CHAPTER_DURATIONS.reduce((total, frames) => total + frames, 0) -
  HOST_TOUR_CHAPTER_TRANSITIONS.reduce((total, frames) => total + frames, 0);

/** Index of the chapter that owns a given frame (last chapter whose start is at or before it). */
export function hostTourChapterIndexAtFrame(frame: number): number {
  let index = 0;
  for (let i = 0; i < HOST_TOUR_CHAPTER_STARTS.length; i += 1) {
    if (HOST_TOUR_CHAPTER_STARTS[i] <= frame) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}
