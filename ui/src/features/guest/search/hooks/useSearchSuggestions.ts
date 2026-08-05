import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { publicSearchFetch } from '@/features/guest/search/lib/publicSearchFetch';
import type { SearchSuggestionsResponse } from '@/features/guest/search/types/search';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export const SEARCH_SUGGESTIONS_QUERY_KEY = ['search-suggestions'] as const;

async function fetchSearchSuggestions(q: string): Promise<SearchSuggestionsResponse> {
  const params = new URLSearchParams();
  params.set('q', q);
  params.set('limit', '8');
  return publicSearchFetch<SearchSuggestionsResponse>('search-suggestions', params);
}

export function useSearchSuggestions(query: string, enabled = true) {
  const debounced = useDebouncedValue(query.trim(), 250);
  const ready = enabled && debounced.length >= 2;

  return useQuery({
    queryKey: [...SEARCH_SUGGESTIONS_QUERY_KEY, debounced],
    queryFn: () => fetchSearchSuggestions(debounced),
    enabled: ready,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 0,
  });
}
