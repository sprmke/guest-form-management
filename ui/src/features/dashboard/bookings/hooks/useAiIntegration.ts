import { useMutation } from '@tanstack/react-query';

import { scopedFunctionsUrl, usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { supabase } from '@/lib/supabase/client';

export type AiIntegrationVerifyDto = {
  apiKeyConfigured: boolean;
  model: string;
  ok: boolean;
  latencyMs?: number;
  statusCode?: number;
  error?: string;
  primaryKeysCount?: number;
  fallbackConfigured?: boolean;
};

type AiIntegrationVerifyResponse = {
  apiKeyConfigured: boolean;
  model: string;
  ok: boolean;
  latencyMs?: number;
  statusCode?: number;
  error?: string;
  geminiKeysCount?: number;
  groqConfigured?: boolean;
};

function mapVerifyResponse(raw: AiIntegrationVerifyResponse): AiIntegrationVerifyDto {
  return {
    apiKeyConfigured: raw.apiKeyConfigured,
    model: raw.model,
    ok: raw.ok,
    latencyMs: raw.latencyMs,
    statusCode: raw.statusCode,
    error: raw.error,
    primaryKeysCount: raw.geminiKeysCount,
    fallbackConfigured: raw.groqConfigured,
  };
}

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

export function useVerifyAiIntegration() {
  const propertyId = usePropertyIdParam();

  return useMutation({
    mutationFn: async (): Promise<AiIntegrationVerifyDto> => {
      const jwt = await getAdminJwt();
      const res = await fetch(scopedFunctionsUrl('/app-settings', propertyId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'verify_ai' }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        verify?: AiIntegrationVerifyResponse;
      };
      if (!res.ok || !json.success || !json.verify) {
        throw new Error(json.error ?? `Verify failed (${res.status})`);
      }
      return mapVerifyResponse(json.verify);
    },
  });
}
