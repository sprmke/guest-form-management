import { AdminPdfZoomPreview } from '@/features/dashboard/bookings/components/AdminPdfZoomPreview';
import { renderPetPdfPreview } from '@/features/dashboard/bookings/lib/petPdfPreview';

import type { PetDetailsValues } from '@/features/dashboard/bookings/lib/petDefaults';

type PetPdfPreviewProps = {
  details: PetDetailsValues;
  signatureUrl?: string | null;
  className?: string;
};

export function PetPdfPreview({ details, signatureUrl, className }: PetPdfPreviewProps) {
  return (
    <AdminPdfZoomPreview
      className={className}
      pageAltPrefix="Pet form preview"
      renderPdfBytes={() => renderPetPdfPreview(details, signatureUrl)}
      refreshDeps={[details.gafUnitOwner, details.gafTowerAndUnitNumber, signatureUrl]}
    />
  );
}
