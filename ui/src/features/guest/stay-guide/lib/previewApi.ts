import type { GuestStayGuideDto } from '@/features/guest/stay-guide/lib/api';

import { supabase } from '@/lib/supabase/client';

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error?: string; message?: string };

function previewGuestStayGuideUrl(propertySlug: string, propertyId: string): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
  const params = new URLSearchParams({
    property_id: propertyId.trim(),
    property: propertySlug.trim(),
  });
  return `${base}/preview-guest-stay-guide?${params.toString()}`;
}

export async function fetchGuestStayGuidePreview(
  propertySlug: string,
  propertyId: string
): Promise<GuestStayGuideDto> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error('Sign in to preview the stay guide.');
  }

  const res = await fetch(previewGuestStayGuideUrl(propertySlug, propertyId), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
  });

  const json = (await res.json()) as ApiSuccess<GuestStayGuideDto> | ApiError;
  if (!res.ok || !json.success) {
    throw new Error(
      ('message' in json && json.message) ||
        ('error' in json && json.error) ||
        'Stay guide preview is not available.'
    );
  }
  return json.data;
}
