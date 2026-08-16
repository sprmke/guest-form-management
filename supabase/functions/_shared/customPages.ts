/**
 * Custom Pages — per-property template selection (v1: stay_guide only).
 * Rows are lazily created on first read, mirroring property_template_contents's default-fallback pattern.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type CustomPageType = 'stay_guide';

export const STAY_GUIDE_DEFAULT_TEMPLATE_KEY = 'stay-guide-warm-arrival';

export type CustomPageRow = {
  id: string;
  propertyId: string;
  pageType: CustomPageType;
  templateKey: string;
  createdAt: string;
  updatedAt: string;
};

function defaultTemplateKeyFor(pageType: CustomPageType): string {
  switch (pageType) {
    case 'stay_guide':
      return STAY_GUIDE_DEFAULT_TEMPLATE_KEY;
  }
}

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

function toCustomPageRow(row: {
  id: string;
  property_id: string;
  page_type: string;
  template_key: string;
  created_at: string;
  updated_at: string;
}): CustomPageRow {
  return {
    id: row.id,
    propertyId: row.property_id,
    pageType: row.page_type as CustomPageType,
    templateKey: row.template_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Get the property's custom_pages row for a page type, creating it with the default template on first read. */
export async function getOrCreateCustomPage(
  propertyId: string,
  pageType: CustomPageType
): Promise<CustomPageRow> {
  const supabase = supabaseAdmin();

  const { data: existing, error: readError } = await supabase
    .from('custom_pages')
    .select('*')
    .eq('property_id', propertyId)
    .eq('page_type', pageType)
    .maybeSingle();

  if (readError) {
    console.error('[customPages] getOrCreateCustomPage read:', readError);
    throw new Error('Failed to load custom page');
  }

  if (existing) return toCustomPageRow(existing);

  const { data: created, error: insertError } = await supabase
    .from('custom_pages')
    .insert({
      property_id: propertyId,
      page_type: pageType,
      template_key: defaultTemplateKeyFor(pageType),
    })
    .select('*')
    .single();

  if (insertError) {
    // Concurrent lazy-create — re-read instead of failing.
    const { data: retried, error: retryError } = await supabase
      .from('custom_pages')
      .select('*')
      .eq('property_id', propertyId)
      .eq('page_type', pageType)
      .maybeSingle();

    if (retryError || !retried) {
      console.error('[customPages] getOrCreateCustomPage insert:', insertError);
      throw new Error('Failed to create custom page');
    }
    return toCustomPageRow(retried);
  }

  return toCustomPageRow(created);
}

/** Thin wrapper for the stay guide render path — just the template key. */
export async function resolveStayGuideTemplateKey(propertyId: string): Promise<string> {
  const row = await getOrCreateCustomPage(propertyId, 'stay_guide');
  return row.templateKey;
}
