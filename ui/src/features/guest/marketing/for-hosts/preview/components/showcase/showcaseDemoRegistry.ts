import type { ComponentType } from 'react';

import type { ShowcaseDemoId } from '@/features/guest/marketing/for-hosts/preview/data/hostShowcase';

import {
  BookingsDemo,
  CalendarDemo,
  InboxDemo,
  MarketingDemo,
  MoneyDemo,
  TeamDemo,
} from './ShowcaseDemos';

/** Maps each feature-group id to its browser-bar path and demo panel. */
export const showcaseDemos: Record<ShowcaseDemoId, { path: string; Component: ComponentType }> = {
  bookings: { path: 'app.kamehomes.com/…/bookings', Component: BookingsDemo },
  calendar: { path: 'app.kamehomes.com/…/calendar', Component: CalendarDemo },
  inbox: { path: 'app.kamehomes.com/…/inbox', Component: InboxDemo },
  money: { path: 'app.kamehomes.com/…/finance', Component: MoneyDemo },
  marketing: { path: 'app.kamehomes.com/…/marketing', Component: MarketingDemo },
  team: { path: 'app.kamehomes.com/…/team', Component: TeamDemo },
};
