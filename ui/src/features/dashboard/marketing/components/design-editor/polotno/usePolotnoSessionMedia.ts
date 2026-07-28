import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ensurePolotnoConfigured } from '@/features/dashboard/marketing/lib/polotno/initPolotno';
import type { PropertyMediaItem } from '@/features/dashboard/marketing/lib/polotno/propertyMedia';

export function mergePropertyMediaItems(
  propertyImages: PropertyMediaItem[],
  sessionUploads: PropertyMediaItem[]
): PropertyMediaItem[] {
  const seen = new Set<string>();
  const merged: PropertyMediaItem[] = [];
  for (const item of [...propertyImages, ...sessionUploads]) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    merged.push(item);
  }
  return merged;
}

export function usePolotnoSessionMedia() {
  const [sessionUploads, setSessionUploads] = useState<PropertyMediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);

  const appendFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploading(true);
    try {
      ensurePolotnoConfigured();
      const added: PropertyMediaItem[] = [];
      for (const file of files) {
        const url = URL.createObjectURL(file);
        blobUrlsRef.current.push(url);
        added.push({ url, preview: url, type: 'image' });
      }
      setSessionUploads((prev) => [...prev, ...added]);
    } finally {
      setIsUploading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      blobUrlsRef.current = [];
    };
  }, []);

  return useMemo(
    () => ({ sessionUploads, isUploading, appendFiles }),
    [sessionUploads, isUploading, appendFiles]
  );
}

export type PolotnoSessionMedia = ReturnType<typeof usePolotnoSessionMedia>;
