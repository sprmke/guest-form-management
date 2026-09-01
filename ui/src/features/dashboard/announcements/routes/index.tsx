import type { ReactNode } from 'react';

import { Navigate, Route } from 'react-router-dom';

import {
  hostAnnouncementsPathFromHelpSupport,
  useHasHostAnnouncementsArchiveScope,
} from '@/features/dashboard/announcements/lib/hostAnnouncementsPaths';
import { HostAnnouncementsPage } from '@/features/dashboard/announcements/pages/HostAnnouncementsPage';
import { useHelpSupportBasePath } from '@/features/dashboard/help-support/lib/helpSupportPaths';
import type { ParkingRouteFn, PropertyRouteFn } from '@/features/dashboard/org/routes/guards';

function HelpSupportAnnouncementsRedirect() {
  const helpSupportPath = useHelpSupportBasePath();
  const hasArchive = useHasHostAnnouncementsArchiveScope();

  if (!helpSupportPath) {
    return <Navigate to=".." replace />;
  }

  if (!hasArchive) {
    return <Navigate to={helpSupportPath} replace />;
  }

  return <Navigate to={hostAnnouncementsPathFromHelpSupport(helpSupportPath)} replace />;
}

export function hostAnnouncementsPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return (
    <Route
      path="announcements"
      element={propertyRoute('announcements', <HostAnnouncementsPage />)}
    />
  );
}

export function hostAnnouncementsParkingRoute(parkingRoute: ParkingRouteFn): ReactNode {
  return (
    <Route
      path="announcements"
      element={parkingRoute('announcements', <HostAnnouncementsPage />)}
    />
  );
}

export function helpSupportAnnouncementsRedirectRoute(): ReactNode {
  return <Route path="announcements" element={<HelpSupportAnnouncementsRedirect />} />;
}
