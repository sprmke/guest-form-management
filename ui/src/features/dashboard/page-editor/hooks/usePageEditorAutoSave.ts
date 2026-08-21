import { useCallback, useEffect, useRef, useState } from 'react';

import type { MarketingAutoSaveStatus } from '@/features/dashboard/marketing/hooks/useMarketingAutoSave';

type Options = {
  enabled?: boolean;
  suspended?: boolean;
  debounceMs?: number;
  contentFingerprint: string | null;
  save: () => Promise<void>;
};

const SAVED_FLASH_MS = 2000;

/** Debounced fingerprint autosave — mirrors useMarketingAutoSave without template IDs. */
export function usePageEditorAutoSave({
  enabled = true,
  suspended = false,
  debounceMs = 1000,
  contentFingerprint,
  save,
}: Options) {
  const [status, setStatus] = useState<MarketingAutoSaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastSavedFingerprintRef = useRef<string | null>(null);
  const saveGenerationRef = useRef(0);
  const wasSuspendedRef = useRef(false);
  const savedFlashTimerRef = useRef<number | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (suspended) {
      wasSuspendedRef.current = true;
      return;
    }
    if (wasSuspendedRef.current) {
      wasSuspendedRef.current = false;
      if (contentFingerprint) {
        lastSavedFingerprintRef.current = contentFingerprint;
        setStatus('idle');
        setErrorMessage(null);
      }
    }
  }, [suspended, contentFingerprint]);

  useEffect(() => {
    if (!enabled || suspended || !contentFingerprint) return;
    if (contentFingerprint === lastSavedFingerprintRef.current) return;

    setStatus((current) => (current === 'pending' ? current : 'pending'));
    setErrorMessage(null);

    const generation = ++saveGenerationRef.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (generation !== saveGenerationRef.current) return;
        setStatus('saving');
        try {
          await saveRef.current();
          if (generation !== saveGenerationRef.current) return;
          lastSavedFingerprintRef.current = contentFingerprint;
          setStatus('saved');
          setErrorMessage(null);
          if (savedFlashTimerRef.current) window.clearTimeout(savedFlashTimerRef.current);
          savedFlashTimerRef.current = window.setTimeout(() => {
            setStatus((current) => (current === 'saved' ? 'idle' : current));
          }, SAVED_FLASH_MS);
        } catch (error) {
          if (generation !== saveGenerationRef.current) return;
          setStatus('error');
          setErrorMessage(error instanceof Error ? error.message : 'Save failed');
        }
      })();
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [contentFingerprint, debounceMs, enabled, suspended]);

  useEffect(() => {
    return () => {
      if (savedFlashTimerRef.current) window.clearTimeout(savedFlashTimerRef.current);
    };
  }, []);

  const markSaved = useCallback((fingerprint: string) => {
    lastSavedFingerprintRef.current = fingerprint;
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return { status, errorMessage, markSaved };
}
