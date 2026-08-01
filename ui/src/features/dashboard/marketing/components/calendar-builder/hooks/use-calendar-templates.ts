import { useCallback, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useMarketingTemplates } from '@/features/dashboard/marketing/hooks/useMarketingTemplates';
import { readCalendarSourcePreset } from '@/features/dashboard/marketing/lib/calendarAutosave';
import { usePropertyIdParam, scopedFunctionsUrl } from '@/features/dashboard/org/lib/adminApiScope';
import { getSessionJwt } from '@/features/dashboard/org/lib/edgeClient';

import type { CalendarStyles } from '../types';

export interface SavedCalendarTemplate {
  id: string;
  name: string;
  styles: CalendarStyles;
  sourcePresetId: string | null;
  aspectPreset: string | null;
  createdAt: string;
  thumbnailDataUrl?: string;
}

export function useCalendarTemplates(_propertySlug: string) {
  const propertyId = usePropertyIdParam();
  const queryClient = useQueryClient();
  const { data: apiTemplates = [] } = useMarketingTemplates('calendar');

  const savedTemplates = useMemo((): SavedCalendarTemplate[] => {
    const rows: SavedCalendarTemplate[] = [];
    for (const row of apiTemplates) {
      const styles = row.designJson?.styles;
      if (!styles || typeof styles !== 'object') continue;
      rows.push({
        id: row.id,
        name: row.name,
        styles: styles as CalendarStyles,
        sourcePresetId: readCalendarSourcePreset(row.designJson),
        aspectPreset: row.aspectPreset,
        createdAt: row.updatedAt,
        thumbnailDataUrl:
          typeof row.designJson?.thumbnailDataUrl === 'string'
            ? row.designJson.thumbnailDataUrl
            : undefined,
      });
    }
    return rows;
  }, [apiTemplates]);

  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const jwt = await getSessionJwt();
        const res = await fetch(scopedFunctionsUrl('marketing-templates', propertyId), {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });
        const json = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !json.success) throw new Error(json.error ?? 'Delete failed');
        void queryClient.invalidateQueries({ queryKey: ['marketing-templates', propertyId] });
        return true;
      } catch (error) {
        toast.error((error as Error).message);
        return false;
      }
    },
    [propertyId, queryClient]
  );

  return useMemo(
    () => ({
      apiTemplates,
      savedTemplates,
      deleteTemplate,
    }),
    [apiTemplates, savedTemplates, deleteTemplate]
  );
}
