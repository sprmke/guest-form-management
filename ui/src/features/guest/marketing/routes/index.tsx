import { Navigate, Route, useParams } from 'react-router-dom';

import { guestAccountRoutes } from '@/features/guest/account/routes';
import { DevelopmentDetailPage } from '@/features/guest/marketing/pages/DevelopmentDetailPage';
import { DevelopmentFormPage } from '@/features/guest/marketing/pages/DevelopmentFormPage';
import { DevelopmentParkingListPage } from '@/features/guest/marketing/pages/DevelopmentParkingListPage';
import { DevelopmentPropertiesPage } from '@/features/guest/marketing/pages/DevelopmentPropertiesPage';
import { DevelopmentsListPage } from '@/features/guest/marketing/pages/DevelopmentsListPage';
import { DevelopmentsLocationPage } from '@/features/guest/marketing/pages/DevelopmentsLocationPage';
import { ForHostsPage } from '@/features/guest/marketing/pages/ForHostsPage';
import { GuestLandingPage } from '@/features/guest/marketing/pages/GuestLandingPage';
import { HostPublicPage } from '@/features/guest/marketing/pages/HostPublicPage';
import { ParkingDetailPage } from '@/features/guest/marketing/pages/ParkingDetailPage';
import { ParkingFormPage } from '@/features/guest/marketing/pages/ParkingFormPage';
import { ParkingsListPage } from '@/features/guest/marketing/pages/ParkingsListPage';
import { ParkingsLocationPage } from '@/features/guest/marketing/pages/ParkingsLocationPage';
import { PrivacyPage } from '@/features/guest/marketing/pages/PrivacyPage';
import { PropertiesListPage } from '@/features/guest/marketing/pages/PropertiesListPage';
import { PropertiesLocationPage } from '@/features/guest/marketing/pages/PropertiesLocationPage';
import { PropertyDetailPage } from '@/features/guest/marketing/pages/PropertyDetailPage';
import { PropertyFormPage } from '@/features/guest/marketing/pages/PropertyFormPage';
import { ServicesPage } from '@/features/guest/marketing/pages/ServicesPage';
import { TermsPage } from '@/features/guest/marketing/pages/TermsPage';
import { MarketingLayoutShell } from '@/features/guest/marketing/shared/components/MarketingLayoutShell';
import { SearchResultsPage } from '@/features/guest/search/pages/SearchResultsPage';

function DevelopmentParkingListRedirect() {
  const { slug = '' } = useParams<{ slug: string }>();
  return <Navigate to={`/developments/${slug}/parking`} replace />;
}

function DevelopmentParkingCategoryRedirect() {
  const { slug = '' } = useParams<{ slug: string }>();
  return <Navigate to={`/developments/${slug}/parking`} replace />;
}

/** PMA (marketing) guest site routes — mock data until public APIs ship. */
export const marketingRoutes = [
  <Route key="marketing-shell" element={<MarketingLayoutShell />}>
    <Route index element={<GuestLandingPage />} />
    <Route path="search" element={<SearchResultsPage />} />
    <Route path="for-hosts" element={<ForHostsPage />} />
    <Route path="services" element={<ServicesPage />} />
    <Route path="hosts/:orgSlug" element={<HostPublicPage />} />
    <Route path="properties" element={<PropertiesListPage />} />
    {/* Location browse — must be before `:propertySlug` so `in` is not treated as a property slug */}
    <Route path="properties/in/:location" element={<PropertiesLocationPage />} />
    <Route path="parkings" element={<ParkingsListPage />} />
    <Route path="parkings/in/:location" element={<ParkingsLocationPage />} />
    <Route path="parkings/:parkingSlug/form" element={<ParkingFormPage />} />
    <Route path="parkings/:parkingSlug" element={<ParkingDetailPage />} />
    <Route path="properties/:propertySlug" element={<PropertyDetailPage />} />
    <Route path="properties/:propertySlug/forms/:formId" element={<PropertyFormPage />} />
    <Route path="developments" element={<DevelopmentsListPage />} />
    {/* Location browse — must be before `:slug` so `in` is not treated as a development slug */}
    <Route path="developments/in/:location" element={<DevelopmentsLocationPage />} />
    <Route path="developments/:slug" element={<DevelopmentDetailPage />} />
    <Route path="developments/:slug/properties" element={<DevelopmentPropertiesPage />} />
    <Route path="developments/:slug/parking" element={<DevelopmentParkingListPage />} />
    <Route
      path="developments/:slug/parking/category"
      element={<DevelopmentParkingCategoryRedirect />}
    />
    <Route path="developments/:slug/parking/list" element={<DevelopmentParkingListRedirect />} />
    <Route path="developments/:slug/forms/:formId" element={<DevelopmentFormPage />} />
    <Route path="terms" element={<TermsPage />} />
    <Route path="privacy" element={<PrivacyPage />} />
    {guestAccountRoutes}
  </Route>,
];
