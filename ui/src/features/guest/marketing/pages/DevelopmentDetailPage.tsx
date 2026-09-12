import { Navigate, useParams } from 'react-router-dom';

import {
  DevelopmentHero,
  DevelopmentAmenities,
  DevelopmentAvailableSection,
} from '@/features/guest/marketing/developments/components';
import { usePublicDevelopment } from '@/features/guest/marketing/developments/hooks/usePublicDevelopment';

import { Skeleton } from '@/components/ui/skeleton';
import { publicPageTitle, usePageTitle } from '@/lib/pageTitle';

export function DevelopmentDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: development, isLoading, isError } = usePublicDevelopment(slug);
  usePageTitle(publicPageTitle(development?.name ? `${development.name}` : 'Development'));

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !development) {
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
