import { useMutation } from '@tanstack/react-query';

import type { CalendarTemplateTokens } from '@/features/dashboard/marketing/lib/calendarAiTokens';
import { usePropertyIdParam, scopedFunctionsUrl } from '@/features/dashboard/org/lib/adminApiScope';
import {
  handleAiMutationError,
  parseEdgeJsonOrQuota,
} from '@/features/dashboard/org/lib/aiQuotaToast';
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
  /** Calendar style locks — folded into the model prompt server-side. */
  preferences?: {
    layoutArchetype?: string;
    fontPairing?: string;
    backgroundMood?: string;
  };
};

export type GenerateMarketingTemplateResult = {
  contentType: 'calendar' | 'design' | 'video';
  tokens: CalendarTemplateTokens;
};

async function parseEdgeJson<T>(res: Response): Promise<T> {
  return parseEdgeJsonOrQuota<T>(res);
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
    onError: (error: Error) => handleAiMutationError(error),
  });
}
