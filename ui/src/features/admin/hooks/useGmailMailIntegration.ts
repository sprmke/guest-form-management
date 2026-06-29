import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

type GmailMailIntegrationStatus = {
  connected: boolean;
  /** True when a stored refresh token fails exchange (expired / revoked). */
  needsReconnect: boolean;
  googleAccountEmail: string | null;
  connectedAt: string | null;
};

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

export function useGmailMailIntegrationStatus() {
  return useQuery({
    queryKey: ['gmail-mail-integration'],
    queryFn: async (): Promise<GmailMailIntegrationStatus> => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/google-mail-oauth-status`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        connected?: boolean;
        needsReconnect?: boolean;
        googleAccountEmail?: string | null;
        connectedAt?: string | null;
      };
      if (!json.success) throw new Error(json.error ?? 'Failed to load Gmail status');
      return {
        connected: !!json.connected,
        needsReconnect: !!json.needsReconnect,
        googleAccountEmail: json.googleAccountEmail ?? null,
        connectedAt: json.connectedAt ?? null,
      };
    },
  });
}

export function useStartGmailMailOAuth() {
  return useMutation({
    mutationFn: async () => {
      const jwt = await getAdminJwt();
      const returnPath = `${window.location.pathname}${window.location.search}`;
      const res = await fetch(`${FUNCTIONS_URL}/google-mail-oauth-start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnPath }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; url?: string };
      if (!json.success || !json.url) {
        throw new Error(json.error ?? 'Failed to start Gmail connection');
      }
      return json.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}

export function useDisconnectGmailMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/google-mail-oauth-disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Failed to disconnect');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['gmail-mail-integration'] });
    },
  });
}
