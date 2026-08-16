/**
 * Loads lean public-listing candidates in deterministic PostgREST ranges.
 *
 * PostgREST projects commonly cap a single response at 1,000 rows even when
 * callers request a larger `.limit()`. Paging avoids that silent truncation.
 * The safety ceiling fails closed instead of returning dishonest totals/facets.
 */

export const PUBLIC_LISTING_WORKING_SET_LIMIT = 20_000;

const POSTGREST_PAGE_SIZE = 1_000;

type FetchPageResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

type FetchPage<T> = (from: number, to: number) => PromiseLike<FetchPageResult<T>>;

export async function loadPublicListingRows<T>(
  label: string,
  fetchPage: FetchPage<T>
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; from < PUBLIC_LISTING_WORKING_SET_LIMIT; from += POSTGREST_PAGE_SIZE) {
    const to = Math.min(from + POSTGREST_PAGE_SIZE - 1, PUBLIC_LISTING_WORKING_SET_LIMIT - 1);
    const { data, error } = await fetchPage(from, to);

    if (error) {
      throw new Error(`${label} candidate query failed: ${error.message ?? 'unknown error'}`);
    }

    const page = data ?? [];
    rows.push(...page);
    if (page.length < to - from + 1) return rows;
  }

  const { data: overflow, error } = await fetchPage(
    PUBLIC_LISTING_WORKING_SET_LIMIT,
    PUBLIC_LISTING_WORKING_SET_LIMIT
  );
  if (error) {
    throw new Error(`${label} overflow probe failed: ${error.message ?? 'unknown error'}`);
  }
  if ((overflow ?? []).length > 0) {
    throw new Error(
      `${label} exceeds the ${PUBLIC_LISTING_WORKING_SET_LIMIT}-row public listing safety ceiling`
    );
  }

  return rows;
}
