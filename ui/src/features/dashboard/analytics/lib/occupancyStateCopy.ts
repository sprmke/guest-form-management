import type { ForwardOccupancyState } from '@/features/dashboard/analytics/lib/types';

export type OccupancyStateCopy = {
  label: string;
  clause: string;
  message: string;
  dot: string;
  text: string;
};

export const FORWARD_OCCUPANCY_COPY: Record<ForwardOccupancyState, OccupancyStateCopy> = {
  fully_booked: {
    label: 'Fully booked',
    clause: 'next 30 days largely booked',
    message: 'The next 30 days are largely booked. A good time to raise rates on what remains.',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  strong: {
    label: 'Strong',
    clause: 'ahead of your baseline',
    message: 'Occupancy is running ahead of your own baseline. Keep doing what is working.',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  building: {
    label: 'Building',
    clause: 'close to your baseline',
    message: 'Occupancy is tracking close to your baseline. A few small nudges can push it higher.',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  underbooked: {
    label: 'Underbooked',
    clause: 'below your usual pace',
    message: 'The next 30 days are running below your usual pace. Check pricing and marketing.',
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
  },
};
