import { createContext, useContext, type ReactNode } from 'react';

import type { GuestStayGuideDto } from '@/features/guest/stay-guide/lib/api';
import type { ResolvedPropertyDetail } from '@/features/guest/marketing/properties/types/publicProperty';

export type StayGuidePreviewOverride = {
  kind: 'stay-guide';
  data: GuestStayGuideDto;
};

export type PropertyLandingPreviewOverride = {
  kind: 'property-landing';
  data: ResolvedPropertyDetail;
};

export type PreviewOverride = StayGuidePreviewOverride | PropertyLandingPreviewOverride;

const PreviewOverrideContext = createContext<PreviewOverride | null>(null);

export function PreviewOverrideProvider({
  value,
  children,
}: {
  value: PreviewOverride | null;
  children: ReactNode;
}) {
  return (
    <PreviewOverrideContext.Provider value={value}>{children}</PreviewOverrideContext.Provider>
  );
}

export function usePreviewOverride(): PreviewOverride | null {
  return useContext(PreviewOverrideContext);
}
