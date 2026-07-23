import { createStore } from 'openpolotno/model/store';

export type PolotnoStore = ReturnType<typeof createStore>;

export async function exportPolotnoStorePng(store: PolotnoStore): Promise<Blob> {
  await store.waitLoading();
  const blob = await store.toBlob({ mimeType: 'image/png', pixelRatio: 2 });
  if (!blob) throw new Error('Export failed');
  return blob;
}

export function createPolotnoStore(): PolotnoStore {
  const store = createStore({ key: '', showCredit: false });
  store.addPage();
  store.history.clear();
  return store;
}
