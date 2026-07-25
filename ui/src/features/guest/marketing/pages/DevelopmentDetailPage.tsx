import { Navigate, useParams } from 'react-router-dom';

import {
  DevelopmentHero,
  DevelopmentAmenities,
  DevelopmentAvailableSection,
} from '@/features/guest/marketing/developments/components';
import { mockDevelopments } from '@/features/guest/marketing/developments/data/mockDevelopments';

export function DevelopmentDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const development = mockDevelopments.find((d) => d.slug === slug);

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
