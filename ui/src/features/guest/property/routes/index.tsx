import { useEffect, useState } from 'react';

import { Navigate, Route, useLocation, useParams, useSearchParams } from 'react-router-dom';

import { CalendarPage } from '@/features/guest/calendar/pages/CalendarPage';
import { PropertyChatPage } from '@/features/guest/chat/pages/PropertyChatPage';
import { GuestForm } from '@/features/guest/form/components/GuestForm';
import { GuestFormSuccess } from '@/features/guest/form/components/GuestFormSuccess';
import { useGuestPaymentInfo } from '@/features/guest/form/hooks/useGuestPaymentInfo';
import { stripLegacyFromQueryParam } from '@/features/guest/form/lib/bookingSourceFromSearchParams';
import {
  formatGuestFooterLabel,
  pickGuestOperationalHeaderProps,
} from '@/features/guest/form/lib/guestFormBranding';
import { readGuestPropertySlug } from '@/features/guest/form/lib/guestPropertyScope';
import { useGuestPropertySlug } from '@/features/guest/hooks/useGuestPropertySlug';
import {
  guestCalendarPath,
  guestFormPath,
  guestPayParkingPath,
  guestSdFormPath,
  guestReviewPath,
  guestSuccessPath,
} from '@/features/guest/lib/guestPublicPaths';
import { fetchPayParking } from '@/features/guest/pay-parking/lib/api';
import { PayParkingPage } from '@/features/guest/pay-parking/pages/PayParkingPage';
import { GuestReviewPage } from '@/features/guest/sd-form/pages/GuestReviewPage';
import { SdFormPage } from '@/features/guest/sd-form/pages/SdFormPage';
import { StayGuidePage } from '@/features/guest/stay-guide/pages/StayGuidePage';

import { MainLayout } from '@/layouts/MainLayout';

function GuestPublicLayout() {
  const location = useLocation();
  const propertySlug = useGuestPropertySlug();
  const { data: guestBrand } = useGuestPaymentInfo();
  const operationalHeader = pickGuestOperationalHeaderProps(guestBrand);
  const isCalendarRoute = /\/calendar\/?$/.test(location.pathname);

  return (
    <MainLayout
      animateOnNavigate
      contentMaxWidth={isCalendarRoute ? 'max-w-2xl' : 'max-w-3xl'}
      brandColor={guestBrand?.brandColor}
      footerLabel={
        guestBrand
          ? formatGuestFooterLabel(guestBrand.organizationName, guestBrand.residenceName)
          : null
      }
      propertySlug={propertySlug}
      propertyImageSrc={operationalHeader.propertyImageSrc}
      propertyName={operationalHeader.propertyName}
    />
  );
}

type LegacySegment = 'calendar' | 'form' | 'success' | 'sd-form' | 'guest-review';

function LegacyGuestPathRedirect({ segment }: { segment: LegacySegment }) {
  const [searchParams] = useSearchParams();
  const property = readGuestPropertySlug(searchParams);
  if (!property) return <Navigate to="/properties" replace />;

  const next = stripLegacyFromQueryParam(new URLSearchParams(searchParams));
  next.delete('property');
  next.delete('property_slug');

  const bookingId = next.get('bookingId')?.trim();
  if (segment === 'sd-form' && !bookingId) return <Navigate to="/properties" replace />;
  if (segment === 'guest-review' && !bookingId) return <Navigate to="/properties" replace />;

  const path =
    segment === 'calendar'
      ? guestCalendarPath(property, next)
      : segment === 'form'
        ? guestFormPath(property, next)
        : segment === 'success'
          ? guestSuccessPath(property, next)
          : segment === 'guest-review'
            ? guestReviewPath(property, bookingId!, next)
            : guestSdFormPath(property, bookingId!, next);

  return <Navigate to={path} replace />;
}

function LegacyPayParkingRedirect() {
  const { bookingId = '' } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const [target, setTarget] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchPayParking(bookingId);
        const slug = data.property_slug?.trim();
        if (!slug || cancelled) {
          if (!cancelled) setFailed(true);
          return;
        }
        const admin = searchParams.get('admin') === 'true';
        if (!cancelled) {
          setTarget(guestPayParkingPath(slug, bookingId, { admin }));
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, searchParams]);

  if (target) return <Navigate to={target} replace />;
  if (failed) return <Navigate to="/properties" replace />;
  return null;
}

/** Operational guest flows scoped to `/properties/:propertySlug/...`. */
export const propertyGuestRoutes = [
  <Route
    key="property-stay-guide"
    path="properties/:propertySlug/stay-guide"
    element={<StayGuidePage />}
  />,
  <Route key="property-guest" path="properties/:propertySlug" element={<GuestPublicLayout />}>
    <Route path="calendar" element={<CalendarPage />} />
    <Route path="messages" element={<PropertyChatPage />} />
    <Route path="form" element={<GuestForm />} />
    <Route path="success" element={<GuestFormSuccess />} />
    <Route path="sd-form" element={<SdFormPage />} />
    <Route path="guest-review" element={<GuestReviewPage />} />
    <Route path="parking/:bookingId" element={<PayParkingPage />} />
  </Route>,
];

/** Redirects from removed global guest paths (preserve `?property=` when present). */
export const legacyGuestRedirects = [
  <Route
    key="legacy-calendar"
    path="/calendar"
    element={<LegacyGuestPathRedirect segment="calendar" />}
  />,
  <Route key="legacy-form" path="/form" element={<LegacyGuestPathRedirect segment="form" />} />,
  <Route
    key="legacy-success"
    path="/success"
    element={<LegacyGuestPathRedirect segment="success" />}
  />,
  <Route
    key="legacy-guest-review"
    path="/guest-review"
    element={<LegacyGuestPathRedirect segment="guest-review" />}
  />,
  <Route
    key="legacy-sd-form"
    path="/sd-form"
    element={<LegacyGuestPathRedirect segment="sd-form" />}
  />,
  <Route
    key="legacy-pay-parking"
    path="/bookings/:bookingId/parking"
    element={<LegacyPayParkingRedirect />}
  />,
];
