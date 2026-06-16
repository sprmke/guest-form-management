import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type GeminiIntegrationVerifyDto = {
  apiKeyConfigured: boolean;
  model: string;
  ok: boolean;
  latencyMs?: number;
  statusCode?: number;
  error?: string;
};

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

export function useVerifyGeminiIntegration() {
  return useMutation({
    mutationFn: async (): Promise<GeminiIntegrationVerifyDto> => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/app-settings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'verify_gemini' }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        verify?: GeminiIntegrationVerifyDto;
      };
      if (!res.ok || !json.success || !json.verify) {
        throw new Error(json.error ?? `Verify failed (${res.status})`);
      }
      return json.verify;
    },
  });
}
