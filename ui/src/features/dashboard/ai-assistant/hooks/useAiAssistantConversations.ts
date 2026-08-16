import { useQuery } from '@tanstack/react-query';

import { fetchAiAssistantConversations } from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { useOrgScopeKey } from '@/features/dashboard/org/lib/adminApiScope';


export function useAiAssistantConversations(enabled: boolean) {
  const { orgSlug, orgId } = useOrgScopeKey();
  return useQuery({
    queryKey: ['org', orgSlug ?? orgId, 'ai-assistant-conversations'],
    enabled: enabled && Boolean(orgSlug || orgId),
    queryFn: () => fetchAiAssistantConversations(orgSlug, orgId),
    staleTime: 15_000,
  });
}
