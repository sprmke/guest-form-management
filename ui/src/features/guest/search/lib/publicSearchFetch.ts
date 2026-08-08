const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type EdgeEnvelope<T> = {
  success?: boolean;
  error?: string;
  data?: T;
};

export async function publicSearchFetch<T>(
  functionName: string,
  params: URLSearchParams
): Promise<T> {
  const url = `${FUNCTIONS_URL}/${functionName}?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });

  const json = (await res.json().catch(() => ({}))) as EdgeEnvelope<T>;

  if (res.status === 429) {
    throw new Error(json.error ?? 'Too many requests. Please wait a moment.');
  }

  if (!res.ok || !json.success || json.data === undefined) {
    throw new Error(json.error ?? `Failed to call ${functionName}`);
  }

  return json.data;
}
