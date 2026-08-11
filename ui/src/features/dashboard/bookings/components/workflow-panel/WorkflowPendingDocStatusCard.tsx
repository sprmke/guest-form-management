/**
 * Read-only status card for a PENDING_DOCUMENTS sub-step (GAF / pet / other)
 * when the rail is not showing a pricing/parking/sd form for that step.
 */

import { FileText } from 'lucide-react';

import { WorkflowSubFormCard } from '@/features/dashboard/bookings/components/WorkflowSubFormCard';
import type { BookingAssetPreviewHandler } from '@/features/dashboard/bookings/hooks/useBookingAssetPreview';
import { statusLabel } from '@/features/dashboard/bookings/lib/bookingStatus';
import type { DocumentRequirement } from '@/features/dashboard/bookings/lib/documentRequirements';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import {
  getPendingDocumentsNestedCompletion,
  type PendingDocNestedKey,
} from '@/features/dashboard/bookings/lib/workflow';

import { semanticBadgeClasses, softBadgeClasses } from '@/lib/statusToneColors';
import { cn } from '@/lib/utils';

type DocLink = { label: string; url?: string | null };

function approvalSourceLabel(
  source: DocumentRequirement['approvalSource'] | undefined
): string | null {
  if (source === 'email-listener') return 'Email';
  if (source === 'manual') return 'Manual';
  return null;
}

function gafHint(booking: BookingRow, completed: boolean): string | null {
  if (!completed) {
    return 'Waiting for Azure’s approved GAF. Approvals arrive automatically when Azure replies.';
  }
  if (booking.approved_gaf_pdf_url?.trim()) return null;
  return 'Marked complete without an approved GAF. Upload it on the booking.';
}

function petHint(booking: BookingRow, completed: boolean): string | null {
  if (!completed) {
    return 'Waiting for Azure’s approved pet request. Approvals arrive automatically when Azure replies.';
  }
  if (booking.approved_pet_pdf_url?.trim()) return null;
  return 'Marked complete without an approved pet file. Upload it on the booking.';
}

function genericHint(completed: boolean): string | null {
  return completed ? null : 'Waiting for this document to be marked complete.';
}

export function PendingDocSubStatusCard({
  booking,
  sub,
  requirements,
  plain = false,
  onPreview,
}: {
  booking: BookingRow;
  sub: PendingDocNestedKey;
  requirements: DocumentRequirement[];
  plain?: boolean;
  onPreview: BookingAssetPreviewHandler;
}) {
  const { byRequirementId } = getPendingDocumentsNestedCompletion(booking, requirements);
  const completed = byRequirementId[sub] ?? false;
  const requirement = requirements.find((req) => req.id === sub);
  const title = requirement?.label ?? statusLabel(sub);
  const via = approvalSourceLabel(requirement?.approvalSource);
  const isGaf = sub === 'gaf';
  const isPet = sub === 'pet';

  const hint = isGaf
    ? gafHint(booking, completed)
    : isPet
      ? petHint(booking, completed)
      : genericHint(completed);

  const links: DocLink[] = isGaf
    ? [
        { label: 'GAF request', url: booking.gaf_request_pdf_url },
        { label: 'Approved GAF', url: booking.approved_gaf_pdf_url },
        { label: 'Valid ID', url: booking.valid_id_url },
      ]
    : isPet
      ? [
          { label: 'Pet request', url: booking.pet_request_pdf_url },
          { label: 'Approved pet', url: booking.approved_pet_pdf_url },
          { label: 'Vaccination', url: booking.pet_vaccination_url },
          { label: 'Pet photo', url: booking.pet_image_url },
        ]
      : [];

  const available = links.filter((l) => Boolean(l.url?.trim()));
  const missingApproved =
    completed &&
    ((isGaf && !booking.approved_gaf_pdf_url?.trim()) ||
      (isPet && !booking.approved_pet_pdf_url?.trim()));

  return (
    <WorkflowSubFormCard title={title} plain={plain} bodyClassName="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-md border px-2.5 py-0.5 text-xs font-semibold',
            completed ? semanticBadgeClasses('success') : softBadgeClasses('warning')
          )}
        >
          {completed ? 'Complete' : 'Incomplete'}
        </span>
        {via ? (
          <span className="text-muted-foreground text-[11px] font-medium">via {via}</span>
        ) : null}
      </div>

      {hint ? (
        <p
          className={cn(
            'text-[12px] leading-snug',
            missingApproved
              ? 'rounded-lg border border-amber-500/25 bg-amber-500/[0.08] px-3 py-2 text-amber-950 dark:text-amber-200'
              : 'text-muted-foreground'
          )}
        >
          {hint}
        </p>
      ) : null}

      {available.length > 0 ? (
        <ul className="border-border/70 divide-border/60 divide-y overflow-hidden rounded-lg border">
          {available.map((item) => (
            <DocLinkRow key={item.label} label={item.label} url={item.url!} onPreview={onPreview} />
          ))}
        </ul>
      ) : null}
    </WorkflowSubFormCard>
  );
}

function DocLinkRow({
  label,
  url,
  onPreview,
}: {
  label: string;
  url: string;
  onPreview: BookingAssetPreviewHandler;
}) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5">
      <span className="text-foreground flex min-w-0 items-center gap-2 text-xs font-medium">
        <FileText className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <button
        type="button"
        onClick={() => void onPreview(label, url)}
        aria-label={`View ${label}`}
        className="text-primary focus-ring hover:text-primary/90 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-end rounded-md px-1 text-xs font-semibold underline-offset-2 hover:underline"
      >
        View
      </button>
    </li>
  );
}
