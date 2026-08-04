import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { CalendarTemplateTokens } from '@/features/dashboard/marketing/lib/calendarAiTokens';
import { usePropertyIdParam, scopedFunctionsUrl } from '@/features/dashboard/org/lib/adminApiScope';
import { getSessionJwt } from '@/features/dashboard/org/lib/edgeClient';

export type GenerateMarketingTemplatePayload = {
  contentType: 'calendar' | 'design' | 'video';
  prompt: string;
  includeContext?: {
    propertyPhoto?: boolean;
    amenities?: boolean;
    availability?: boolean;
  };
  amenitiesText?: string;
  availabilityText?: string;
};

export type GenerateMarketingTemplateResult = {
  contentType: 'calendar' | 'design' | 'video';
  tokens: CalendarTemplateTokens;
};

async function parseEdgeJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as { success?: boolean; error?: string; data?: T };
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json.data as T;
}

export async function generateMarketingTemplateRequest(
  propertyId: string | null,
  payload: GenerateMarketingTemplatePayload
): Promise<GenerateMarketingTemplateResult> {
  const jwt = await getSessionJwt();
  const res = await fetch(scopedFunctionsUrl('generate-marketing-template', propertyId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return parseEdgeJson(res);
}

export function useGenerateMarketingTemplate() {
  const propertyId = usePropertyIdParam();

  return useMutation({
    mutationFn: (payload: GenerateMarketingTemplatePayload) =>
      generateMarketingTemplateRequest(propertyId, payload),
    onError: (error: Error) => toast.error(error.message || 'AI generation failed'),
  });
}
