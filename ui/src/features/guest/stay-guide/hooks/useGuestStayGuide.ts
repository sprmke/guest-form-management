import { useQuery } from '@tanstack/react-query';

import { fetchGuestStayGuide } from '@/features/guest/stay-guide/lib/api';
import { fetchGuestStayGuidePreview } from '@/features/guest/stay-guide/lib/previewApi';

export const GUEST_STAY_GUIDE_QUERY_KEY = ['guest-stay-guide'] as const;

export function useGuestStayGuide(propertySlug: string, token: string) {
  return useQuery({
    queryKey: [...GUEST_STAY_GUIDE_QUERY_KEY, propertySlug, token],
    queryFn: () => fetchGuestStayGuide(propertySlug, token),
    enabled: Boolean(propertySlug.trim() && token.trim()),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function useGuestStayGuidePreview(propertySlug: string, propertyId: string) {
  return useQuery({
    queryKey: [...GUEST_STAY_GUIDE_QUERY_KEY, 'preview', propertySlug, propertyId],
    queryFn: () => fetchGuestStayGuidePreview(propertySlug, propertyId),
    enabled: Boolean(propertySlug.trim() && propertyId.trim()),
    staleTime: 1000 * 60 * 2,
    retry: false,
  });
}
