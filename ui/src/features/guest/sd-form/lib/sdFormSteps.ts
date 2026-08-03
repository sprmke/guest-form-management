import { Gift, Star, Wallet } from 'lucide-react';

import type { GuestFormStepConfig } from '@/features/guest/form/lib/guestFormSteps';

export const SD_FORM_STEPS: GuestFormStepConfig[] = [
  {
    id: 1,
    short: 'Review',
    label: 'Leave a Review',
    hint: 'Share your experience',
    icon: Star,
  },
  {
    id: 2,
    short: 'Surprise',
    label: 'Claim surprise',
    hint: 'Spin for your next stay',
    icon: Gift,
  },
  {
    id: 3,
    short: 'Refund',
    label: 'Refund details',
    hint: 'Receive your deposit',
    icon: Wallet,
  },
];
