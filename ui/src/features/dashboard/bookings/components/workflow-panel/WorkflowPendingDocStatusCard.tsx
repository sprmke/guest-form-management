/**
 * Read-only status card for a PENDING_DOCUMENTS sub-step (GAF / pet / other)
 * when the rail is not showing a pricing/parking/sd form for that step.
 *
 * The host opens this step to answer one question — what is still outstanding —
 * so every expected file gets a row: the ones on file open a preview, the ones
 * missing read `Pending` instead of being dropped from the list. Rows are grouped
 * as **Sent Docs** (outbound package) and **Pending Docs** / **Approved Docs**
 * (signed copy back, label flips when the sub-step is complete).
 */

import { useId } from 'react';

import { FileClock, FileText } from 'lucide-react';

import { WorkflowSubFormCard } from '@/features/dashboard/bookings/components/WorkflowSubFormCard';
import type { BookingAssetPreviewHandler } from '@/features/dashboard/bookings/hooks/useBookingAssetPreview';
import { statusLabel } from '@/features/dashboard/bookings/lib/bookingStatus';
import {
  hasApplicableDocumentPdfTemplate,
  requirementApplies,
  requirementDocKind,
  type DocumentRequirement,
} from '@/features/dashboard/bookings/lib/documentRequirements';
import { withStorageUrlCacheBust } from '@/features/dashboard/bookings/lib/storageUrls';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import {
  getPendingDocumentsNestedCompletion,
  readDocumentCompletions,
  type PendingDocNestedKey,
} from '@/features/dashboard/bookings/lib/workflow';
import { nestedAdvanceMode } from '@/features/dashboard/bookings/lib/workflowAdvanceMode';

import { cn } from '@/lib/utils';

type DocRow = { label: string; url: string | null | undefined };
type DocGroup = { key: string; label: string; rows: DocRow[] };

const DOC_GROUP_SENT = 'Sent Docs';

function docGroupApprovalLabel(completed: boolean): string {
  return completed ? 'Approved Docs' : 'Pending Docs';
}

/** Right-column action link — matches `BookingCompactAssetControl` preview links. */
const DOC_ROW_ACTION =
  'text-primary text-xs font-semibold underline-offset-2 hover:underline hover:text-primary/90';

/** Right-column outstanding state — workflow amber, same family as incomplete stepper nodes. */
const DOC_ROW_PENDING = 'text-xs font-semibold text-amber-700 dark:text-amber-400';

type DocStepState = 'not-required' | 'not-sent' | 'awaiting' | 'approved' | 'complete-without-file';

function previewStorageUrl(url: string, statusUpdatedAt: string | null | undefined): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/[?&]v=/.test(trimmed)) return trimmed;
  return withStorageUrlCacheBust(trimmed, statusUpdatedAt);
}

function validIdRows(booking: BookingRow): DocRow[] {
  const additional: Array<{ name: string | null; url: string | null }> = [
    { name: booking.guest2_name, url: booking.guest2_valid_id_url },
    { name: booking.guest3_name, url: booking.guest3_valid_id_url },
    { name: booking.guest4_name, url: booking.guest4_valid_id_url },
    { name: booking.guest5_name, url: booking.guest5_valid_id_url },
  ];

  return [
    { label: 'Valid ID', url: booking.valid_id_url },
    // Azure files the GAF against every guest on the booking, so a named guest
    // without an ID on file is an outstanding document, not an empty slot.
    ...additional
      .map((guest, index) => ({ ...guest, position: index + 2 }))
      .filter((guest) => Boolean(guest.name?.trim()))
      .map((guest) => ({ label: `Valid ID · Guest ${guest.position}`, url: guest.url })),
  ];
}

function requestPdfUrl(booking: BookingRow, kind: 'gaf' | 'pet'): string | null {
  const raw = kind === 'gaf' ? booking.gaf_request_pdf_url : booking.pet_request_pdf_url;
  const trimmed = raw?.trim() ?? '';
  return trimmed || null;
}

function docGroups(
  booking: BookingRow,
  requirements: DocumentRequirement[],
  requirement: DocumentRequirement | undefined,
  sub: PendingDocNestedKey,
  approvedUrl: string | null,
  approvalGroupCompleted: boolean
): DocGroup[] {
  const kind = requirementDocKind(requirement, sub);
  const approvalLabel = docGroupApprovalLabel(approvalGroupCompleted);

  if (kind === 'gaf') {
    const sentRows: DocRow[] = [];
    if (hasApplicableDocumentPdfTemplate(requirements, booking, 'gaf')) {
      sentRows.push({ label: 'GAF Request', url: requestPdfUrl(booking, 'gaf') });
    }
    sentRows.push(...validIdRows(booking));

    return [
      {
        key: 'sent',
        label: DOC_GROUP_SENT,
        rows: sentRows,
      },
      {
        key: 'approval',
        label: approvalLabel,
        rows: [{ label: 'Approved GAF', url: approvedUrl }],
      },
    ];
  }

  if (kind === 'pet') {
    const sentRows: DocRow[] = [];
    if (hasApplicableDocumentPdfTemplate(requirements, booking, 'pet')) {
      sentRows.push({ label: 'Pet Request Form', url: requestPdfUrl(booking, 'pet') });
    }
    sentRows.push(
      { label: 'Vaccination', url: booking.pet_vaccination_url },
      { label: 'Pet photo', url: booking.pet_image_url }
    );

    return [
      {
        key: 'sent',
        label: DOC_GROUP_SENT,
        rows: sentRows,
      },
      {
        key: 'approval',
        label: approvalLabel,
        rows: [{ label: 'Approved Pet Request', url: approvedUrl }],
      },
    ];
  }

  return [
    {
      key: 'approval',
      label: approvalLabel,
      rows: [{ label: 'Approved form', url: approvedUrl }],
    },
  ];
}

function resolveDocStepState({
  applies,
  beforeRequestSent,
  completed,
  approvedUrl,
}: {
  applies: boolean;
  beforeRequestSent: boolean;
  completed: boolean;
  approvedUrl: string | null;
}): DocStepState {
  if (!applies) return 'not-required';
  // A fresh review outranks stored completions, same guard the stepper applies —
  // a prior cycle's approval must not read as done before the request re-sends.
  if (beforeRequestSent) return 'not-sent';
  if (completed) return approvedUrl ? 'approved' : 'complete-without-file';
  return 'awaiting';
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
  const groupIdPrefix = useId();
  const { byRequirementId } = getPendingDocumentsNestedCompletion(booking, requirements);
  const requirement = requirements.find((req) => req.id === sub);
  const applies = requirement ? requirementApplies(requirement, booking) : false;
  const completion = readDocumentCompletions(booking)[sub];
  const approvedUrl = completion?.approvedPdfUrl?.trim() ? completion.approvedPdfUrl : null;
  const beforeRequestSent = booking.status === 'PENDING_REVIEW' || booking.status === 'IMPORTED';
  const state = resolveDocStepState({
    applies,
    beforeRequestSent,
    completed: byRequirementId[sub] ?? false,
    approvedUrl,
  });

  const subStepCompleted = state === 'approved' || state === 'complete-without-file';
  const groups = applies
    ? docGroups(booking, requirements, requirement, sub, approvedUrl, subStepCompleted)
    : [];
  const showGroupLabels = groups.length > 1;

  return (
    <WorkflowSubFormCard
      title={requirement?.label ?? statusLabel(sub)}
      plain={plain}
      bodyClassName="space-y-3.5"
      advanceMode={nestedAdvanceMode(requirement?.approvalSource)}
    >
      {groups.length > 0 ? (
        <div className="border-border/70 divide-separator divide-y overflow-hidden rounded-lg border">
          {groups.map((group) => {
            const onFile = group.rows.filter((row) => Boolean(row.url?.trim())).length;
            const headingId = `${groupIdPrefix}-${group.key}`;

            return (
              <section key={group.key}>
                {showGroupLabels ? (
                  <div className="border-separator bg-muted/40 flex items-center justify-between gap-2 border-b px-3 py-1.5">
                    <h4
                      id={headingId}
                      className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider"
                    >
                      {group.label}
                    </h4>
                    <span className="text-muted-foreground text-[11px] font-medium tabular-nums">
                      {onFile} of {group.rows.length}
                    </span>
                  </div>
                ) : null}
                <ul
                  className="divide-border/60 divide-y"
                  aria-labelledby={showGroupLabels ? headingId : undefined}
                >
                  {group.rows.map((row) => (
                    <DocLinkRow
                      key={row.label}
                      label={row.label}
                      url={row.url}
                      approvalAction={group.key === 'approval'}
                      statusUpdatedAt={booking.status_updated_at}
                      onPreview={onPreview}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}
    </WorkflowSubFormCard>
  );
}

function DocLinkRow({
  label,
  url,
  approvalAction = false,
  statusUpdatedAt,
  onPreview,
}: {
  label: string;
  url: string | null | undefined;
  approvalAction?: boolean;
  statusUpdatedAt?: string | null;
  onPreview: BookingAssetPreviewHandler;
}) {
  const stored = url?.trim() ?? '';
  const Icon = stored ? FileText : FileClock;
  const actionLabel = approvalAction && stored ? 'Approved' : 'View';

  return (
    <li className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5">
      <span
        className={cn(
          'flex min-w-0 items-center gap-2 text-xs font-medium',
          stored ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <Icon
          className={cn('size-3.5 shrink-0', stored ? 'text-muted-foreground' : 'opacity-60')}
          aria-hidden
        />
        <span className="truncate">{label}</span>
      </span>
      {stored ? (
        <button
          type="button"
          onClick={() => void onPreview(label, previewStorageUrl(stored, statusUpdatedAt))}
          aria-label={`View ${label}`}
          className={cn(
            'focus-ring inline-flex min-h-11 min-w-11 shrink-0 items-center justify-end rounded-md px-1',
            DOC_ROW_ACTION
          )}
        >
          {actionLabel}
        </button>
      ) : (
        <span className={DOC_ROW_PENDING}>Pending</span>
      )}
    </li>
  );
}
