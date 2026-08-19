const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

export async function getSessionJwt(): Promise<string> {
  const { readE2EAdminAccessToken } = await import('@/lib/e2e/adminSession');
  const mockedJwt = readE2EAdminAccessToken();
  if (mockedJwt) {
    return mockedJwt;
  }

  const { supabase } = await import('@/lib/supabase/client');

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshed.session?.access_token) {
    return refreshed.session.access_token;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    await supabase.auth.signOut();
    throw new Error('Your session expired. Please sign in again.');
  }

  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) {
    await supabase.auth.signOut();
    throw new Error('Not signed in');
  }
  return jwt;
}

export async function callEdgeFunction<T>(path: string, init?: RequestInit): Promise<T> {
  const jwt = await getSessionJwt();
  const res = await fetch(`${FUNCTIONS_URL}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json.data as T;
}
