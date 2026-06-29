import type { GafDetailsValues } from "@/lib/gafDefaults";
import { renderGafPdfPreview } from "@/features/admin/lib/gafPdfPreview";
import { AdminPdfZoomPreview } from "@/features/admin/components/AdminPdfZoomPreview";

type GafPdfPreviewProps = {
  details: GafDetailsValues;
  signatureUrl?: string | null;
  className?: string;
};

export function GafPdfPreview({
  details,
  signatureUrl,
  className,
}: GafPdfPreviewProps) {
  return (
    <AdminPdfZoomPreview
      className={className}
      pageAltPrefix="GAF preview"
      renderPdfBytes={() => renderGafPdfPreview(details, signatureUrl)}
      refreshDeps={[
        details.gafUnitOwner,
        details.gafTowerAndUnitNumber,
        details.gafGuestsOnsiteContactPerson,
        details.gafOwnerContactNumber,
        signatureUrl,
      ]}
    />
  );
}
