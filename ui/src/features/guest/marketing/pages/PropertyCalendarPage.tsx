import { Navigate, useParams, useSearchParams } from 'react-router-dom';

import { PublicPropertyCalendar } from '@/features/guest/marketing/properties/components/property-detail/PublicPropertyCalendar';
import { PropertyPageHeader } from '@/features/guest/marketing/properties/components/PropertyPageHeader';
import { mockProperties } from '@/features/guest/marketing/properties/data/mockProperties';
import { mockPropertyInfo } from '@/features/guest/marketing/forms/data/mockForms';

export function PropertyCalendarPage() {
  const { propertySlug = '' } = useParams<{ propertySlug: string }>();
  const [searchParams] = useSearchParams();
  const isCustom = searchParams.get('custom') === 'true';

  const property = mockProperties.find((p) => p.slug === propertySlug || p.id === propertySlug);
  const formPropertyInfo = mockPropertyInfo[propertySlug];

  if (!property && !formPropertyInfo) {
    return <Navigate to="/properties" replace />;
  }

  const propertyName = property?.name ?? formPropertyInfo?.name ?? propertySlug;
  const propertyLocation = property?.location ?? formPropertyInfo?.location ?? '';
  const propertyImage = property?.images[0] ?? formPropertyInfo?.image ?? null;

  return (
    <div className="bg-background min-h-screen pb-24 pt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          <PropertyPageHeader
            propertySlug={propertySlug}
            propertyName={propertyName}
            propertyLocation={propertyLocation}
            propertyImage={propertyImage}
            rating={property?.rating}
            reviews={property?.reviews}
            isSuperhost={property?.isSuperhost}
            propertyType={property?.type}
            guests={property?.guests}
            bedrooms={property?.bedrooms}
            checkInTime="2:00 PM"
            checkOutTime="11:00 AM"
            pageLabel="Availability Calendar"
          />

          <PublicPropertyCalendar
            propertyName={propertyName}
            propertySlug={propertySlug}
            isCustom={isCustom}
          />
        </div>
      </div>
    </div>
  );
}
