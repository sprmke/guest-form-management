export type PropertyMediaItem = {
  url: string;
  preview: string;
  type: 'image' | 'video';
};

export function propertyMediaItems(imageUrls: string[]): PropertyMediaItem[] {
  const unique = [...new Set(imageUrls.filter(Boolean))];
  return unique.map((url) => ({ url, preview: url, type: 'image' as const }));
}

export function propertyGalleryMediaItems(
  media: Array<{ url: string; type: 'image' | 'video' }>
): PropertyMediaItem[] {
  const seen = new Set<string>();
  const items: PropertyMediaItem[] = [];
  for (const item of media) {
    if (!item.url.trim() || seen.has(item.url)) continue;
    seen.add(item.url);
    items.push({ url: item.url, preview: item.url, type: item.type });
  }
  return items;
}
