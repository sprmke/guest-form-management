import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { adminEdgeFetchJson } from '@/lib/api/adminEdgeFetch';

export type VoiceReceptionistSettingsDto = {
  propertyId: string;
  enabled: boolean;
  voiceId: string;
  personaPrompt: string | null;
  maxSessionSeconds: number;
  maxSessionsPerGuestPerDay: number;
  maxConcurrentSessions: number;
  availableVoices: readonly string[];
};

export type VoiceReceptionistFormValues = {
  enabled: boolean;
  voiceId: string;
  personaPrompt: string;
  maxSessionSeconds: number;
  maxSessionsPerGuestPerDay: number;
  maxConcurrentSessions: number;
};

export function voiceReceptionistToFormValues(
  data: VoiceReceptionistSettingsDto
): VoiceReceptionistFormValues {
  return {
    enabled: data.enabled,
    voiceId: data.voiceId,
    personaPrompt: data.personaPrompt ?? '',
    maxSessionSeconds: data.maxSessionSeconds,
    maxSessionsPerGuestPerDay: data.maxSessionsPerGuestPerDay,
    maxConcurrentSessions: data.maxConcurrentSessions,
  };
}

export function voiceReceptionistFormIsDirty(
  draft: VoiceReceptionistFormValues,
  baseline: VoiceReceptionistFormValues
): boolean {
  return (
    draft.enabled !== baseline.enabled ||
    draft.voiceId !== baseline.voiceId ||
    draft.personaPrompt.trim() !== baseline.personaPrompt.trim() ||
    draft.maxSessionSeconds !== baseline.maxSessionSeconds ||
    draft.maxSessionsPerGuestPerDay !== baseline.maxSessionsPerGuestPerDay ||
    draft.maxConcurrentSessions !== baseline.maxConcurrentSessions
  );
}

export type VoiceReceptionistSettingsPatch = Partial<{
  enabled: boolean;
  voiceId: string;
  personaPrompt: string | null;
  maxSessionSeconds: number;
  maxSessionsPerGuestPerDay: number;
  maxConcurrentSessions: number;
}>;

export function buildVoiceReceptionistPatch(
  draft: VoiceReceptionistFormValues
): VoiceReceptionistSettingsPatch {
  return {
    enabled: draft.enabled,
    voiceId: draft.voiceId,
    personaPrompt: draft.personaPrompt.trim() || null,
    maxSessionSeconds: draft.maxSessionSeconds,
    maxSessionsPerGuestPerDay: draft.maxSessionsPerGuestPerDay,
    maxConcurrentSessions: draft.maxConcurrentSessions,
  };
}

const VOICE_RECEPTIONIST_SETTINGS_PATH = '/voice-receptionist-settings';

export function useVoiceReceptionistSettings() {
  const propertyId = usePropertyIdParam();
  return useQuery({
    queryKey: ['voice-receptionist-settings', propertyId],
    queryFn: () =>
      adminEdgeFetchJson<{ data: VoiceReceptionistSettingsDto }>(
        VOICE_RECEPTIONIST_SETTINGS_PATH,
        undefined,
        propertyId,
        'Failed to load voice receptionist settings'
      ).then((json) => json.data),
    enabled: Boolean(propertyId),
  });
}

export function useUpdateVoiceReceptionistSettings() {
  const qc = useQueryClient();
  const propertyId = usePropertyIdParam();
  return useMutation({
    mutationFn: (patch: VoiceReceptionistSettingsPatch) =>
      adminEdgeFetchJson<{ data: VoiceReceptionistSettingsDto }>(
        VOICE_RECEPTIONIST_SETTINGS_PATH,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        },
        propertyId,
        'Failed to save voice receptionist settings'
      ).then((json) => json.data),
    onSuccess: (data) => {
      qc.setQueryData(['voice-receptionist-settings', propertyId], data);
    },
  });
}
