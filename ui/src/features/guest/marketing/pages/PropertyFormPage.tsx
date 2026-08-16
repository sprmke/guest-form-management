import { Navigate, useParams } from 'react-router-dom';

import { FormPageWrapper } from '@/features/guest/marketing/forms/components';
import {
  getFormByPropertyAndFormId,
  mockPropertyInfo,
} from '@/features/guest/marketing/forms/data/mockForms';
import { mockProperties } from '@/features/guest/marketing/properties/data/mockProperties';

export function PropertyFormPage() {
  const { propertySlug = '', formId = '' } = useParams<{ propertySlug: string; formId: string }>();
  const form = getFormByPropertyAndFormId(propertySlug, formId);

  if (!form) {
    return <Navigate to="/properties" replace />;
  }

  const formPropertyInfo = mockPropertyInfo[form.propertyId] ?? {
    name: 'Property',
    location: 'Philippines',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600',
    host: 'Host',
  };

  const fullProperty = mockProperties.find(
    (p) => p.slug === propertySlug || p.id === propertySlug || p.slug === form.propertyId
  );

  return (
    <FormPageWrapper
      form={form}
      propertyId={propertySlug}
      propertyName={formPropertyInfo.name}
      propertyLocation={formPropertyInfo.location}
      propertyImage={formPropertyInfo.image}
      hostName={formPropertyInfo.host}
      rating={fullProperty?.rating}
      reviews={fullProperty?.reviews}
      isSuperhost={fullProperty?.isSuperhost}
      propertyType={fullProperty?.type}
      guests={fullProperty?.guests}
      bedrooms={fullProperty?.bedrooms}
    />
  );
}
