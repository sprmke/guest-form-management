import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';

export type VoiceReceptionistGlobalSettingsDto = {
  enabled: boolean;
  updatedBy: string | null;
  updatedAt: string;
};

const QUERY_KEY = ['super-admin', 'voice-receptionist-global-settings'] as const;

export function useVoiceReceptionistGlobalSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () =>
      callEdgeFunction<VoiceReceptionistGlobalSettingsDto>('voice-receptionist-global-settings'),
  });
}

export function useUpdateVoiceReceptionistGlobalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      callEdgeFunction<VoiceReceptionistGlobalSettingsDto>('voice-receptionist-global-settings', {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data);
    },
  });
}
