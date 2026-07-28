import { useCallback, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  useMarketingTemplates,
  useSaveMarketingTemplate,
  useUpdateMarketingTemplate,
} from '@/features/dashboard/marketing/hooks/useMarketingTemplates';
import { readCalendarSourcePreset } from '@/features/dashboard/marketing/lib/calendarAutosave';
import { calendarFormatToAspectPreset } from '@/features/dashboard/marketing/lib/calendarCanvasFormats';
import { usePropertyIdParam, scopedFunctionsUrl } from '@/features/dashboard/org/lib/adminApiScope';
import { getSessionJwt } from '@/features/dashboard/org/lib/edgeClient';

import { createDefaultStyles, normalizeCalendarStyles } from '../types';

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
  const saveRemote = useSaveMarketingTemplate();
  const updateRemote = useUpdateMarketingTemplate();

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

  const saveTemplate = useCallback(
    (name: string, styles: CalendarStyles, thumbnailDataUrl?: string | null) => {
      if (!name.trim()) return;
      const normalized = normalizeCalendarStyles(styles);
      void saveRemote.mutateAsync({
        name: name.trim(),
        contentType: 'calendar',
        aspectPreset: calendarFormatToAspectPreset(normalized.canvasFrame.format),
        designJson: {
          styles: JSON.parse(JSON.stringify(normalized)),
          ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
        },
      });
    },
    [saveRemote]
  );

  const updateTemplate = useCallback(
    (id: string, name: string, styles: CalendarStyles, thumbnailDataUrl?: string | null) => {
      if (!name.trim()) return;
      const normalized = normalizeCalendarStyles(styles);
      void updateRemote.mutateAsync({
        id,
        name: name.trim(),
        aspectPreset: calendarFormatToAspectPreset(normalized.canvasFrame.format),
        designJson: {
          styles: JSON.parse(JSON.stringify(normalized)),
          ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
        },
      });
    },
    [updateRemote]
  );

  const applySavedTemplate = useCallback(
    (id: string): CalendarStyles | null => {
      const template = savedTemplates.find((t) => t.id === id);
      if (!template) return null;
      return normalizeCalendarStyles(JSON.parse(JSON.stringify(template.styles)));
    },
    [savedTemplates]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
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
      } catch (error) {
        toast.error((error as Error).message);
      }
    },
    [propertyId, queryClient]
  );

  const createNewTemplate = useCallback(() => createDefaultStyles(), []);

  return useMemo(
    () => ({
      apiTemplates,
      savedTemplates,
      saveTemplate,
      updateTemplate,
      applySavedTemplate,
      deleteTemplate,
      createNewTemplate,
    }),
    [
      apiTemplates,
      savedTemplates,
      saveTemplate,
      updateTemplate,
      applySavedTemplate,
      deleteTemplate,
      createNewTemplate,
    ]
  );
}
