import { usePreviewOverride } from '@/features/guest/lib/previewOverrideContext';

/** True when showcase chrome must stay inside a nested scrollport (Page Editor, embed iframe). */
export function useShowcaseContainedChrome(embed: boolean): boolean {
  const override = usePreviewOverride();
  return embed || override?.kind === 'property-showcase';
}

/** True when palette / motion should follow editor config live (no guest localStorage). */
export function useShowcaseConfigControlled(): boolean {
  const override = usePreviewOverride();
  return override?.kind === 'property-showcase';
}
