import { Navigate, useParams } from 'react-router-dom';

import { mockDevelopments } from '@/features/guest/marketing/developments/data/mockDevelopments';
import { FormPageWrapper } from '@/features/guest/marketing/forms/components';
import {
  getFormByDevelopmentSlugAndFormId,
  mockDevelopmentInfo,
} from '@/features/guest/marketing/forms/data/mockForms';

export function DevelopmentFormPage() {
  const { slug = '', formId = '' } = useParams<{ slug: string; formId: string }>();
  const form = getFormByDevelopmentSlugAndFormId(slug, formId);

  if (!form) {
    return <Navigate to="/developments" replace />;
  }

  const development = mockDevelopments.find((d) => d.slug === slug);
  const devInfo = mockDevelopmentInfo[form.propertyId];

  const name = development?.name ?? devInfo?.name ?? 'Development';
  const location = development?.location ?? devInfo?.location ?? 'Philippines';
  const image = development?.coverImage ?? devInfo?.image ?? '';
  const developerName = development?.developerName ?? devInfo?.developerName ?? 'Developer';

  return (
    <FormPageWrapper
      form={form}
      propertyId={slug}
      propertyName={name}
      propertyLocation={location}
      propertyImage={image}
      hostName={developerName}
      backUrl={`/developments/${slug}`}
      backLabel={`Back to ${name}`}
      sourceType="development"
    />
  );
}
