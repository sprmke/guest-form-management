import { useEffect } from 'react';

import { useSearchParams } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import {
  PropertyCalendarViewToggle,
  type PropertyCalendarViewId,
} from '@/features/dashboard/pricing/components/PropertyCalendarViewToggle';
import { PropertyOccupancyCalendarPanel } from '@/features/dashboard/pricing/components/PropertyOccupancyCalendarPanel';
import { PropertyPricingPage } from '@/features/dashboard/pricing/pages/PropertyPricingPage';
import { usePropertyPermissions } from '@/features/dashboard/team/hooks/usePropertyPermissions';
import { hasPropertyPermission } from '@/features/dashboard/team/lib/propertyPermissions';

function parseRequestedView(sp: URLSearchParams): PropertyCalendarViewId | null {
  const v = sp.get('view');
  return v === 'occupancy' || v === 'pricing' ? v : null;
}

export function PropertyCalendarPage() {
  const { data: access, isLoading } = usePropertyPermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const permissions = access?.permissions;
  const showOccupancy = hasPropertyPermission(permissions, 'bookings:view');
  const showPricing = hasPropertyPermission(permissions, 'pricing:view');

  const requestedView = parseRequestedView(searchParams);
  const defaultView: PropertyCalendarViewId = showOccupancy ? 'occupancy' : 'pricing';
  const view: PropertyCalendarViewId =
    requestedView === 'occupancy' && showOccupancy
      ? 'occupancy'
      : requestedView === 'pricing' && showPricing
        ? 'pricing'
        : defaultView;

  useEffect(() => {
    if (isLoading || requestedView === view) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('view', view);
        return next;
      },
      { replace: true }
    );
  }, [isLoading, requestedView, view, setSearchParams]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!showOccupancy && !showPricing) {
    return null;
  }

  const setView = (next: PropertyCalendarViewId) =>
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        sp.set('view', next);
        return sp;
      },
      { replace: true }
    );

  return (
    <div className="space-y-3 sm:space-y-4">
      <AdminPageHeader
        id="calendar-heading"
        variant="compact"
        title="Calendar"
        subtitle="View stays and manage rates for this property."
        actions={
          showOccupancy && showPricing ? (
            <PropertyCalendarViewToggle
              value={view}
              onChange={setView}
              showOccupancy={showOccupancy}
              showPricing={showPricing}
            />
          ) : null
        }
        actionsClassName="w-full sm:w-auto"
      />

      {view === 'occupancy' ? <PropertyOccupancyCalendarPanel /> : <PropertyPricingPage embedded />}
    </div>
  );
}
