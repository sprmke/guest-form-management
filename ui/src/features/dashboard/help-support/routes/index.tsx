import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { HelpDocumentationPage } from '@/features/dashboard/help-support/pages/HelpDocumentationPage';
import { HelpSupportOverviewPage } from '@/features/dashboard/help-support/pages/HelpSupportOverviewPage';
import { MyTicketsPage } from '@/features/dashboard/help-support/pages/MyTicketsPage';
import { SubmitTicketPage } from '@/features/dashboard/help-support/pages/SubmitTicketPage';
import { TicketDetailPage } from '@/features/dashboard/help-support/pages/TicketDetailPage';
import type { ParkingRouteFn, PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

export function helpSupportPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return (
    <>
      <Route
        path="help-support"
        element={propertyRoute('help-support', <HelpSupportOverviewPage />)}
      />
      <Route
        path="help-support/docs"
        element={propertyRoute('help-support', <HelpDocumentationPage />)}
      />
      <Route
        path="help-support/tickets"
        element={propertyRoute('help-support', <MyTicketsPage />)}
      />
      <Route
        path="help-support/tickets/new"
        element={propertyRoute('help-support', <SubmitTicketPage />)}
      />
      <Route
        path="help-support/tickets/:ticketId"
        element={propertyRoute('help-support', <TicketDetailPage />)}
      />
    </>
  );
}

export function helpSupportParkingRoute(parkingRoute: ParkingRouteFn): ReactNode {
  return (
    <>
      <Route
        path="help-support"
        element={parkingRoute('help-support', <HelpSupportOverviewPage />)}
      />
      <Route
        path="help-support/docs"
        element={parkingRoute('help-support', <HelpDocumentationPage />)}
      />
      <Route path="help-support/tickets" element={parkingRoute('help-support', <MyTicketsPage />)} />
      <Route
        path="help-support/tickets/new"
        element={parkingRoute('help-support', <SubmitTicketPage />)}
      />
      <Route
        path="help-support/tickets/:ticketId"
        element={parkingRoute('help-support', <TicketDetailPage />)}
      />
    </>
  );
}
