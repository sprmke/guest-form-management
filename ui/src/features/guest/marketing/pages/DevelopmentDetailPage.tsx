import { Navigate, useParams } from 'react-router-dom';

import {
  DevelopmentHero,
  DevelopmentAmenities,
  DevelopmentAvailableSection,
} from '@/features/guest/marketing/developments/components';
import { mockDevelopments } from '@/features/guest/marketing/developments/data/mockDevelopments';

import { publicPageTitle, usePageTitle } from '@/lib/pageTitle';

export function DevelopmentDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const development = mockDevelopments.find((d) => d.slug === slug);
  usePageTitle(publicPageTitle(development?.name ? `${development.name}` : 'Development'));

  if (!development) {
    return <Navigate to="/developments" replace />;
  }

  return (
    <div className="bg-background min-h-screen">
      <DevelopmentHero development={development} />
      <DevelopmentAmenities development={development} />
      <DevelopmentAvailableSection development={development} />
    </div>
  );
}
