import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ORGANIZATIONS_QUERY_KEY } from '@/features/dashboard/org/hooks/useOrganizations';
import { scopedOrgFunctionsUrl, useOrgScopeKey } from '@/features/dashboard/org/lib/adminApiScope';

import {
  resolveMainSocialPlatform,
  socialUrlMapFromLinks,
} from '@/features/dashboard/org/lib/propertySocialLinks';

import { supabase } from '@/lib/supabase/client';

export type OrgSettingsFieldSource = 'db' | 'default';

export type OrgSettingsDto = {
  facebookPageUrl: string;
  airbnbUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  mainSocialPlatform: string;
  emailLogoUrl: string;
  updatedAt: string | null;
  fieldSources: Record<
    | 'facebookPageUrl'
    | 'airbnbUrl'
    | 'instagramUrl'
    | 'tiktokUrl'
    | 'mainSocialPlatform'
    | 'emailLogoUrl',
    OrgSettingsFieldSource
  >;
};

export type OrgOperatorSettingsFormValues = {
  facebookPageUrl: string;
  airbnbUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  mainSocialPlatform: string;
};

export function orgSettingsToFormValues(data: OrgSettingsDto): OrgOperatorSettingsFormValues {
  return {
    facebookPageUrl: data.facebookPageUrl,
    airbnbUrl: data.airbnbUrl,
    instagramUrl: data.instagramUrl,
    tiktokUrl: data.tiktokUrl,
    mainSocialPlatform: data.mainSocialPlatform ?? '',
  };
}

export function orgOperatorFormIsDirty(
  draft: OrgOperatorSettingsFormValues,
  baseline: OrgOperatorSettingsFormValues
): boolean {
  return (
    draft.facebookPageUrl.trim() !== baseline.facebookPageUrl.trim() ||
    draft.airbnbUrl.trim() !== baseline.airbnbUrl.trim() ||
    draft.instagramUrl.trim() !== baseline.instagramUrl.trim() ||
    draft.tiktokUrl.trim() !== baseline.tiktokUrl.trim() ||
    draft.mainSocialPlatform.trim() !== baseline.mainSocialPlatform.trim()
  );
}

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

function orgSettingsUrl(orgSlug: string | null, orgId: string | null): string {
  return scopedOrgFunctionsUrl('/org-settings', orgSlug, orgId);
}

export function useOrgSettings() {
  const { orgSlug, orgId } = useOrgScopeKey();
  return useQuery({
    queryKey: ['org-settings', orgSlug ?? orgId],
    queryFn: async (): Promise<OrgSettingsDto> => {
      const jwt = await getAdminJwt();
      const res = await fetch(orgSettingsUrl(orgSlug, orgId), {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: OrgSettingsDto;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error ?? 'Failed to load organization settings');
      }
      return json.data;
    },
    enabled: Boolean(orgSlug || orgId),
  });
}

export function useUpdateOrgSettings() {
  const qc = useQueryClient();
  const { orgSlug, orgId } = useOrgScopeKey();
  return useMutation({
    mutationFn: async (values: OrgOperatorSettingsFormValues) => {
      const jwt = await getAdminJwt();
      const urls = socialUrlMapFromLinks(values);
      const mainSocialPlatform = resolveMainSocialPlatform(values.mainSocialPlatform, urls) ?? '';
      const res = await fetch(orgSettingsUrl(orgSlug, orgId), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facebookPageUrl: values.facebookPageUrl,
          airbnbUrl: values.airbnbUrl,
          instagramUrl: values.instagramUrl,
          tiktokUrl: values.tiktokUrl,
          mainSocialPlatform,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: OrgSettingsDto;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `Save failed (${res.status})`);
      }
      return json.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['org-settings', orgSlug ?? orgId], data);
      qc.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });
}

export function useClearOrgSettingsImage() {
  const qc = useQueryClient();
  const { orgSlug, orgId } = useOrgScopeKey();
  return useMutation({
    mutationFn: async () => {
      const jwt = await getAdminJwt();
      const res = await fetch(orgSettingsUrl(orgSlug, orgId), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailLogoUrl: '' }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: OrgSettingsDto;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `Reset failed (${res.status})`);
      }
      return json.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['org-settings', orgSlug ?? orgId], data);
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      qc.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
    },
  });
}
