import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteAiAssistantConversation,
  fetchAiAssistantConversations,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { useOrgScopeKey } from '@/features/dashboard/org/lib/adminApiScope';

export function aiAssistantConversationsQueryKey(orgSlug: string | null, orgId: string | null) {
  return ['org', orgSlug ?? orgId, 'ai-assistant-conversations'] as const;
}

export function useAiAssistantConversations(enabled: boolean) {
  const { orgSlug, orgId } = useOrgScopeKey();
  return useQuery({
    queryKey: aiAssistantConversationsQueryKey(orgSlug, orgId),
    enabled: enabled && Boolean(orgSlug || orgId),
    queryFn: () => fetchAiAssistantConversations(orgSlug, orgId),
    staleTime: 15_000,
  });
}

export function useDeleteAiAssistantConversation() {
  const queryClient = useQueryClient();
  const { orgSlug, orgId } = useOrgScopeKey();

  return useMutation({
    mutationFn: (conversationId: string) => deleteAiAssistantConversation(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: aiAssistantConversationsQueryKey(orgSlug, orgId),
      });
    },
  });
}
