import { createStore } from 'openpolotno/model/store';

import type { DesignBinding } from '@/features/dashboard/marketing/lib/designCanvasTypes';
import { captureDesignPresetThumbnail } from '@/features/dashboard/marketing/lib/designPresetThumbnailCapture';
import { blobToDataUrl } from '@/features/dashboard/marketing/lib/exportVideoMedia';
import { ensurePolotnoConfigured } from '@/features/dashboard/marketing/lib/polotno/initPolotno';
import type { PolotnoStore } from '@/features/dashboard/marketing/lib/polotno/polotnoStore';

const THUMB_PIXEL_RATIO = 0.2;

async function storeToThumbnailDataUrl(store: PolotnoStore): Promise<string | null> {
  await store.waitLoading();
  const blob = await store.toBlob({
    mimeType: 'image/jpeg',
    pixelRatio: THUMB_PIXEL_RATIO,
  });
  if (!blob || blob.size < 64) return null;
  return blobToDataUrl(blob);
}

function createThumbnailStore() {
  ensurePolotnoConfigured();
  return createStore({ key: '', showCredit: false });
}

export async function renderDesignPresetThumbnail(
  templateId: string,
  binding: DesignBinding
): Promise<string | null> {
  return captureDesignPresetThumbnail(templateId, binding);
}

export async function renderDesignPolotnoJsonThumbnail(
  polotnoJson: Record<string, unknown>
): Promise<string | null> {
  const store = createThumbnailStore();
  try {
    store.loadJSON(polotnoJson);
    store.history.clear();
    return await storeToThumbnailDataUrl(store);
  } catch {
    return null;
  } finally {
    (store as { destroy?: () => void }).destroy?.();
  }
}

export async function renderDesignStoreThumbnail(store: PolotnoStore): Promise<string | null> {
  try {
    return await storeToThumbnailDataUrl(store);
  } catch {
    return null;
  }
}
