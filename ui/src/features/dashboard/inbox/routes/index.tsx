import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { OrgInboxPage } from '@/features/dashboard/inbox/pages/OrgInboxPage';
import type { OrgRouteFn } from '@/features/dashboard/org/routes/guards';

export function orgInboxRoute(orgRoute: OrgRouteFn): ReactNode {
  return <Route path="/org/:orgSlug/inbox" element={orgRoute('inbox', <OrgInboxPage />)} />;
}
