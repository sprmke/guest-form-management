/**
 * `PendingDocSubStatusCard` + `DocLinkRow` — ported verbatim from the
 * pre-decomposition `WorkflowPanel.tsx`. Read-only status card for a
 * PENDING_DOCUMENTS sub-step (GAF / pet request) not owned by the active
 * pricing/parking/sd-refund sub-form.
 */

import { useEffect, useState } from 'react';

import { ExternalLink, Loader2 } from 'lucide-react';

import { WorkflowSubFormCard } from '@/features/dashboard/bookings/components/WorkflowSubFormCard';
import { statusLabel } from '@/features/dashboard/bookings/lib/bookingStatus';
import {
  isStorageObjectNotFoundError,
  normalizeStoragePublicUrl,
  parseStorageUrl,
  PRIVATE_STORAGE_BUCKETS,
  resolveAssetUrlForBrowser,
} from '@/features/dashboard/bookings/lib/storageUrls';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import type { PendingDocumentSubStatus } from '@/features/dashboard/bookings/lib/workflow';
import { isSubStatusCompleted } from '@/features/dashboard/bookings/lib/workflow';
import { workflowInlineLink } from '@/features/dashboard/bookings/lib/workflowActionButtonStyles';

import { cn } from '@/lib/utils';

export function PendingDocSubStatusCard({
  booking,
  sub,
  plain = false,
}: {
  booking: BookingRow;
  sub: PendingDocumentSubStatus;
  plain?: boolean;
}) {
  const completed = isSubStatusCompleted(sub, booking);
  const isGaf = sub === 'PENDING_GAF';
  const isPet = sub === 'PENDING_PET_REQUEST';

  return (
    <WorkflowSubFormCard title={statusLabel(sub)} plain={plain}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">Status</span>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
              completed
                ? 'bg-primary/10 text-primary'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
            )}
          >
            {completed ? 'Complete' : 'Incomplete'}
          </span>
        </div>

        {isGaf ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs leading-relaxed">
              {!completed
                ? 'Waiting for Azure’s approved GAF. Use Run Gmail poll if an email was missed.'
                : booking.approved_gaf_pdf_url?.trim()
                  ? 'Azure returned an approved GAF. Sub-step marked complete.'
                  : 'Marked complete without an approved GAF file. Upload manually on the booking.'}
            </p>
            <DocLinkRow label="GAF request PDF" url={booking.gaf_request_pdf_url} />
            <DocLinkRow label="Approved GAF" url={booking.approved_gaf_pdf_url} />
            <DocLinkRow label="Guest valid ID" url={booking.valid_id_url} />
          </div>
        ) : null}

        {isPet ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs leading-relaxed">
              {!completed
                ? 'Waiting for Azure’s approved pet request. Use Run Gmail poll if missed.'
                : booking.approved_pet_pdf_url?.trim()
                  ? 'Azure returned an approved pet request. Sub-step marked complete.'
                  : 'Marked complete without an approved pet file. Upload manually on the booking.'}
            </p>
            <DocLinkRow label="Pet request PDF" url={booking.pet_request_pdf_url} />
            <DocLinkRow label="Approved pet request" url={booking.approved_pet_pdf_url} />
            <DocLinkRow label="Pet vaccination" url={booking.pet_vaccination_url} />
            <DocLinkRow label="Pet photo" url={booking.pet_image_url} />
          </div>
        ) : null}
      </div>
    </WorkflowSubFormCard>
  );
}

function DocLinkRow({ label, url }: { label: string; url?: string | null }) {
  const trimmed = url?.trim();
  const normalized = trimmed ? (normalizeStoragePublicUrl(trimmed) ?? trimmed) : null;
  const parsed = normalized ? parseStorageUrl(normalized) : null;
  const needsSignedUrl = Boolean(parsed && PRIVATE_STORAGE_BUCKETS.has(parsed.bucket));

  const [resolvedUrl, setResolvedUrl] = useState<string | null>(() =>
    trimmed && !needsSignedUrl ? normalized : null
  );
  const [loading, setLoading] = useState(false);
  const [missingInStorage, setMissingInStorage] = useState(false);

  useEffect(() => {
    if (!trimmed) {
      setResolvedUrl(null);
      setLoading(false);
      setMissingInStorage(false);
      return;
    }
    if (!needsSignedUrl) {
      setResolvedUrl(normalized);
      setLoading(false);
      setMissingInStorage(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMissingInStorage(false);
    setResolvedUrl(null);
    resolveAssetUrlForBrowser(trimmed)
      .then((signed) => {
        if (!cancelled) setResolvedUrl(signed);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isStorageObjectNotFoundError(err)) {
          setMissingInStorage(true);
          return;
        }
        setResolvedUrl(normalized);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trimmed, normalized, needsSignedUrl]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {!trimmed ? (
        <span className="text-muted-foreground italic">Not available</span>
      ) : loading ? (
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Loading…
        </span>
      ) : missingInStorage ? (
        <span className="text-muted-foreground italic">File missing from storage</span>
      ) : (
        <a
          href={resolvedUrl ?? normalized ?? trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(workflowInlineLink, 'inline-flex items-center gap-1')}
        >
          View
          <ExternalLink className="size-3 shrink-0" aria-hidden />
        </a>
      )}
    </div>
  );
}
