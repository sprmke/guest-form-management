import { useEffect, useState } from 'react';

import { onSnapshot, type IAnyStateTreeNode } from 'mobx-state-tree';

import { marketingContentFingerprint } from '@/features/dashboard/marketing/lib/marketingContentFingerprint';
import type { PolotnoStore } from '@/features/dashboard/marketing/lib/polotno/polotnoStore';

const SNAPSHOT_COALESCE_MS = 300;

/** Tracks Polotno canvas edits via MST snapshots (coalesced for performance). */
export function usePolotnoStoreFingerprint(
  store: PolotnoStore | null,
  extras?: Record<string, unknown>
) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!store) return;

    let timer: number | undefined;
    const dispose = onSnapshot(store as unknown as IAnyStateTreeNode, () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setRevision((value) => value + 1), SNAPSHOT_COALESCE_MS);
    });

    return () => {
      if (timer) window.clearTimeout(timer);
      dispose();
    };
  }, [store]);

  if (!store) return null;

  return marketingContentFingerprint({
    revision,
    polotno: store.toJSON(),
    ...extras,
  });
}
