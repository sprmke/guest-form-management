import type { PetDetailsValues } from "@/lib/petDefaults";
import { renderPetPdfPreview } from "@/features/admin/lib/petPdfPreview";
import { AdminPdfZoomPreview } from "@/features/admin/components/AdminPdfZoomPreview";

type PetPdfPreviewProps = {
  details: PetDetailsValues;
  signatureUrl?: string | null;
  className?: string;
};

export function PetPdfPreview({
  details,
  signatureUrl,
  className,
}: PetPdfPreviewProps) {
  return (
    <AdminPdfZoomPreview
      className={className}
      pageAltPrefix="Pet form preview"
      renderPdfBytes={() => renderPetPdfPreview(details, signatureUrl)}
      refreshDeps={[
        details.gafUnitOwner,
        details.gafTowerAndUnitNumber,
        signatureUrl,
      ]}
    />
  );
}
