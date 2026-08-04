import { useEffect, useMemo, useState } from 'react';

import { Ban, Expand, ExternalLink, FileText, Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

import { normalizeStoragePublicUrl } from '@/features/dashboard/bookings/lib/storageUrls';
import { VerificationStatusBadge } from '@/features/dashboard/org/components/verification/VerificationStatusBadge';
import {
  ORG_SOCIAL_PROOF_PLATFORMS,
  ORG_VERIFICATION_RIGHTS,
} from '@/features/dashboard/org/lib/orgVerification';
import { formatTowerAndUnit } from '@/features/dashboard/org/lib/propertyTowerUnit';
import { VerificationDocThumbnail } from '@/features/dashboard/super-admin/components/super-admin-approvals/VerificationDocThumbnail';
import {
  useApproveOrgVerification,
  useDecideContractConsideration,
  useOrgVerificationAssets,
  useRejectOrgVerification,
} from '@/features/dashboard/super-admin/hooks/useApprovals';
import {
  buildChangeDocOptions,
  buildRequestChangesMessage,
  HOST_REQUEST_CHANGES_REASON_OPTIONS,
  type ChangeDocId,
  type HostRequestChangesReasonId,
} from '@/features/dashboard/super-admin/lib/requestChangesMessage';
import {
  buildRejectionMessage,
  HOST_REJECTION_REASON_OPTIONS,
  type HostRejectionReasonId,
} from '@/features/dashboard/super-admin/lib/rejectReasonOptions';
import type {
  OrgApprovalSummary,
  OrgApprovalUnitConflict,
} from '@/features/dashboard/super-admin/types/approval';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Panel = 'review' | 'changes' | 'reject';

/** Wide, wrapping reason dropdown — long labels stay readable in the panel. */
const reasonSelectTriggerClass =
  'h-auto min-h-[44px] items-start gap-2 py-2.5 text-left [&>span]:line-clamp-none [&>span]:flex-1 [&>span]:whitespace-normal [&>span]:break-words';
const reasonSelectContentClass =
  'w-[var(--radix-select-trigger-width)] max-w-[min(calc(100vw-1.5rem),40rem)]';
const reasonSelectItemClass =
  'items-start whitespace-normal py-2.5 pl-9 pr-3 leading-snug [&>span:last-child]:whitespace-normal [&>span:last-child]:break-words';

function browserAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  let normalized = normalizeStoragePublicUrl(url.trim()) ?? url.trim();

  // Keep storage object URLs on the project origin (ngrok/tunnel rewrites break media embeds).
  const projectBase = (import.meta.env.VITE_SUPABASE_PROJECT_URL as string | undefined)?.replace(
    /\/+$/,
    ''
  );
  if (projectBase && /\/storage\/v1\/object\//.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      const project = new URL(projectBase);
      if (parsed.origin !== project.origin) {
        normalized = `${project.origin}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      /* keep normalized */
    }
  }

  return normalized;
}

function getDocType(url: string): 'image' | 'pdf' | 'file' {
  const path = decodeURIComponent(url.split('?')[0] ?? '').toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|heic|heif)$/.test(path)) return 'image';
  if (/\.pdf$/.test(path)) return 'pdf';
  return 'file';
}

function rightsLabel(value: string | null): string | null {
  if (!value) return null;
  return ORG_VERIFICATION_RIGHTS.find((r) => r.value === value)?.label ?? value;
}

function platformLabel(value: string | null): string | null {
  if (!value) return null;
  return ORG_SOCIAL_PROOF_PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

function hostModesLabel(hostModes: string[]): string {
  const hasProperty = hostModes.includes('property');
  const hasParking = hostModes.includes('parking');
  if (hasProperty && hasParking) return 'Property + Parking';
  if (hasParking) return 'Parking';
  return 'Property';
}

function formatApprovalDate(value: string | null): string {
  if (!value) return '—';
  const trimmed = value.trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const date = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(trimmed);
  if (Number.isNaN(date.getTime())) return trimmed;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function unitConflictsOf(approval: OrgApprovalSummary): OrgApprovalUnitConflict[] {
  return Array.isArray(approval.unitConflicts) ? approval.unitConflicts : [];
}

function successionConfirmMessage(conflicts: OrgApprovalUnitConflict[]): string {
  const orgNames = [...new Set(conflicts.map((c) => c.orgName.trim()).filter(Boolean))];
  const orgLabel = orgNames[0] || 'the current host';
  if (orgNames.length <= 1) {
    return `Archive ${orgLabel}'s active listing and activate this one. Future bookings stay on the old property.`;
  }
  return `Archive active listings from ${orgNames.join(', ')} and activate this one. Future bookings stay on the old property.`;
}

function UnitConflictList({ conflicts }: { conflicts: OrgApprovalUnitConflict[] }) {
  if (conflicts.length === 0) return null;

  return (
    <section className="space-y-3">
      <p className="text-foreground text-xs font-semibold uppercase tracking-wide">
        Active listing
      </p>
      <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
        {conflicts.map((conflict) => {
          const orgLabel = conflict.orgName.trim() || 'Unknown org';
          const unitLabel = formatTowerAndUnit(conflict.tower, conflict.unitNumber);
          return (
            <li
              key={conflict.propertyId}
              className="flex min-h-[44px] flex-col gap-0.5 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="min-w-0">
                <p className="text-foreground truncate text-sm font-medium">{orgLabel}</p>
                <p className="text-muted-foreground truncate text-xs tabular-nums">{unitLabel}</p>
              </div>
              <span className="text-muted-foreground shrink-0 text-xs font-medium uppercase tracking-wide">
                {conflict.status || 'ACTIVE'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type PreviewAsset = {
  label: string;
  url: string;
  type: 'image' | 'pdf' | 'file';
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="text-muted-foreground w-[7.5rem] shrink-0 text-xs font-medium">{label}</dt>
      <dd className="text-foreground min-w-0 text-sm">{value}</dd>
    </div>
  );
}

function DocPreviewCard({
  label,
  url,
  onFullView,
}: {
  label: string;
  url: string | null;
  onFullView: (asset: PreviewAsset) => void;
}) {
  const displayUrl = browserAssetUrl(url);

  if (!displayUrl) {
    return (
      <div className="border-border bg-muted/30 flex flex-col overflow-hidden rounded-xl border border-dashed">
        <div className="bg-muted flex aspect-[4/3] items-center justify-center px-3 text-center">
          <p className="text-muted-foreground text-xs">Not provided</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-muted-foreground truncate text-xs font-medium">{label}</p>
        </div>
      </div>
    );
  }

  const type = getDocType(displayUrl);
  const openFull = () => onFullView({ label, url: displayUrl, type });

  return (
    <div className="border-border bg-card flex flex-col overflow-hidden rounded-xl border">
      <button
        type="button"
        onClick={openFull}
        className="bg-muted relative aspect-[4/3] w-full overflow-hidden text-left"
        aria-label={`Full view ${label}`}
      >
        <VerificationDocThumbnail url={displayUrl} type={type} label={label} />
      </button>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-foreground min-w-0 truncate text-xs font-medium">{label}</p>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={openFull}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 items-center justify-center rounded-lg transition-colors"
            aria-label={`Full view ${label}`}
            title="Full view"
          >
            <Expand className="size-3.5" aria-hidden />
          </button>
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 items-center justify-center rounded-lg transition-colors"
            aria-label={`Open ${label} in new tab`}
            title="Open in new tab"
          >
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}

function FullViewDialog({ asset, onClose }: { asset: PreviewAsset | null; onClose: () => void }) {
  return (
    <ResponsiveModal open={Boolean(asset)} onOpenChange={(next) => (!next ? onClose() : null)}>
      <ResponsiveModalContent
        showCloseButton={false}
        sheetLayout="split"
        className={cn(
          'flex max-h-[min(92dvh,calc(100dvh-1.5rem))] w-[min(calc(100vw-1.5rem),56rem)] max-w-none flex-col gap-0 overflow-hidden p-0',
          'sm:w-[min(94vw,56rem)] sm:max-w-[56rem] sm:p-0',
          'lg:h-[min(90dvh,calc(100dvh-1.5rem))] lg:max-h-[min(90dvh,calc(100dvh-1.5rem))]'
        )}
      >
        {asset ? (
          <>
            <div className="border-border flex min-h-[52px] shrink-0 items-center justify-between gap-2 border-b px-2.5 sm:min-h-[56px] sm:px-4">
              <ResponsiveModalHeader className="min-w-0 flex-1 space-y-0 p-0 pr-0 text-left">
                <ResponsiveModalTitle className="truncate text-xs font-semibold sm:text-sm">
                  {asset.label}
                </ResponsiveModalTitle>
              </ResponsiveModalHeader>
              <div className="flex items-center gap-2">
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-border hover:bg-muted/50 inline-flex min-h-[44px] items-center justify-center rounded-lg border px-3 text-xs font-medium"
                >
                  Open in new tab
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="border-border text-muted-foreground hover:bg-muted/50 inline-flex size-11 items-center justify-center rounded-lg border"
                  aria-label="Close preview"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </div>
            <div className="bg-muted flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain p-2 sm:p-3">
              {asset.type === 'image' ? (
                <img
                  src={browserAssetUrl(asset.url) ?? asset.url}
                  alt={asset.label}
                  className="max-h-full max-w-full object-contain"
                />
              ) : asset.type === 'pdf' ? (
                <iframe
                  title={asset.label}
                  src={browserAssetUrl(asset.url) ?? asset.url}
                  className="bg-card h-full min-h-[min(50dvh,20rem)] w-full rounded-lg border-0"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 px-4 text-center">
                  <FileText className="text-muted-foreground size-10" aria-hidden />
                  <a
                    href={browserAssetUrl(asset.url) ?? asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                  >
                    Open file
                  </a>
                </div>
              )}
            </div>
          </>
        ) : null}
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

type Props = {
  approval: OrgApprovalSummary | null;
  onOpenChange: (open: boolean) => void;
};

export function SuperAdminApprovalReviewDialog({ approval, onOpenChange }: Props) {
  const open = Boolean(approval);
  const orgId = approval?.organizationId;
  const { data: detail, isLoading } = useOrgVerificationAssets(orgId);
  const approveMutation = useApproveOrgVerification();
  const rejectMutation = useRejectOrgVerification();
  const decideConsideration = useDecideContractConsideration();

  const [panel, setPanel] = useState<Panel>('review');
  const [rejectReasonId, setRejectReasonId] = useState<HostRejectionReasonId | ''>('');
  const [rejectCustomNote, setRejectCustomNote] = useState('');
  const [selectedChangeReasons, setSelectedChangeReasons] = useState<
    Set<HostRequestChangesReasonId>
  >(() => new Set());
  const [changeNote, setChangeNote] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<Set<ChangeDocId>>(() => new Set());
  const [fullView, setFullView] = useState<PreviewAsset | null>(null);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  const hostModes = detail?.organization.hostModes ?? approval?.hostModes ?? [];
  const changeDocOptions = useMemo(
    () => (detail ? buildChangeDocOptions(detail, hostModes) : []),
    [detail, hostModes]
  );
  const selectedLabels = changeDocOptions
    .filter((option) => selectedDocs.has(option.id))
    .map((option) => option.label);
  const selectedChangeReasonIds = HOST_REQUEST_CHANGES_REASON_OPTIONS.map((o) => o.id).filter(
    (id) => selectedChangeReasons.has(id)
  );
  const changesMessage = buildRequestChangesMessage(
    selectedChangeReasonIds,
    selectedLabels,
    changeNote
  );
  const rejectMessage = buildRejectionMessage(rejectReasonId, rejectCustomNote);

  useEffect(() => {
    if (!open) return;
    setPanel('review');
    setRejectReasonId('');
    setRejectCustomNote('');
    setSelectedChangeReasons(new Set());
    setChangeNote('');
    setSelectedDocs(new Set());
    setApproveConfirmOpen(false);
  }, [open, orgId]);

  if (!approval) return null;

  const unitConflicts = unitConflictsOf(approval);
  const hasActiveUnitConflict = approval.hasActiveUnitConflict === true || unitConflicts.length > 0;
  const needsProperty = hostModes.includes('property');
  const needsParking = hostModes.includes('parking');
  const status = detail?.verification.baseStatus ?? approval.baseStatus;
  const rejectionKind =
    detail?.verification.baseRejectionKind ?? approval.baseRejectionKind ?? null;
  const decided = status !== 'pending';
  const verification = detail?.verification;
  const busy = approveMutation.isPending || rejectMutation.isPending;

  const close = () => {
    setPanel('review');
    setRejectReasonId('');
    setRejectCustomNote('');
    setSelectedChangeReasons(new Set());
    setChangeNote('');
    setSelectedDocs(new Set());
    setFullView(null);
    setApproveConfirmOpen(false);
    onOpenChange(false);
  };

  const backToReview = () => {
    setPanel('review');
    setRejectReasonId('');
    setRejectCustomNote('');
    setSelectedChangeReasons(new Set());
    setChangeNote('');
    setSelectedDocs(new Set());
  };

  const toggleDoc = (id: ChangeDocId, checked: boolean) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleChangeReason = (id: HostRequestChangesReasonId, checked: boolean) => {
    setSelectedChangeReasons((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ orgId: approval.organizationId, tier: 'base' });
      toast.success(`${approval.organizationName} approved`);
      setApproveConfirmOpen(false);
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const requestApprove = () => {
    if (hasActiveUnitConflict) {
      setApproveConfirmOpen(true);
      return;
    }
    void handleApprove();
  };

  const handleReject = async () => {
    if (!rejectMessage) return;
    try {
      await rejectMutation.mutateAsync({
        orgId: approval.organizationId,
        tier: 'base',
        kind: 'rejected',
        reason: rejectMessage,
      });
      toast.success(`${approval.organizationName} rejected`);
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save decision');
    }
  };

  const handleRequestChanges = async () => {
    if (!changesMessage) return;
    try {
      await rejectMutation.mutateAsync({
        orgId: approval.organizationId,
        tier: 'base',
        kind: 'changes',
        reason: changesMessage,
        changesRequestedDocs: Array.from(selectedDocs),
      });
      toast.success(`${approval.organizationName}: changes requested`);
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not request changes');
    }
  };

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={(next) => (!next ? close() : null)}>
        <ResponsiveModalContent
          showCloseButton
          sheetLayout="split"
          className={cn(
            'flex max-h-[min(92dvh,44rem)] w-[min(calc(100vw-1.5rem),40rem)] max-w-none flex-col gap-0 overflow-hidden p-0',
            'sm:w-[min(94vw,42rem)] sm:max-w-[42rem] sm:p-0',
            'lg:h-[min(90dvh,44rem)] lg:max-h-[min(90dvh,44rem)]'
          )}
        >
          <ResponsiveModalHeader
            className={cn(
              'border-border shrink-0 space-y-2 border-b px-5 pb-4 pt-5 text-left sm:px-6',
              panel === 'changes' && 'bg-orange-500/[0.04]',
              panel === 'reject' && 'bg-destructive/[0.04]'
            )}
          >
            {panel === 'changes' ? (
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-700">
                  <RefreshCw className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 space-y-1">
                  <ResponsiveModalTitle className="text-lg font-semibold">
                    Request changes
                  </ResponsiveModalTitle>
                  <p className="text-muted-foreground truncate text-xs">
                    {approval.organizationName}
                    {approval.ownerName ? ` · ${approval.ownerName}` : ''}
                  </p>
                </div>
              </div>
            ) : panel === 'reject' ? (
              <div className="flex items-start gap-3">
                <span className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Ban className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 space-y-1">
                  <ResponsiveModalTitle className="text-lg font-semibold">
                    Reject
                  </ResponsiveModalTitle>
                  <p className="text-muted-foreground truncate text-xs">
                    {approval.organizationName}
                    {approval.ownerName ? ` · ${approval.ownerName}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <ResponsiveModalTitle className="text-lg font-semibold">
                    {approval.organizationName}
                  </ResponsiveModalTitle>
                  <VerificationStatusBadge status={status} kind={rejectionKind} />
                </div>
                <p className="text-muted-foreground text-xs">
                  {approval.ownerName}
                  {approval.ownerEmail ? ` · ${approval.ownerEmail}` : ''}
                </p>
              </>
            )}
          </ResponsiveModalHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            {isLoading || !detail || !verification ? (
              <div className="flex justify-center py-10">
                <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
              </div>
            ) : panel === 'changes' ? (
              <div className="space-y-5">
                <fieldset className="space-y-2">
                  <legend className="text-foreground text-xs font-semibold">
                    Reason <span className="text-destructive">*</span>
                  </legend>
                  <div className="space-y-1.5">
                    {HOST_REQUEST_CHANGES_REASON_OPTIONS.map((option) => {
                      const checked = selectedChangeReasons.has(option.id);
                      const checkboxId = `request-change-reason-${option.id}`;
                      return (
                        <label
                          key={option.id}
                          htmlFor={checkboxId}
                          className={cn(
                            'border-border flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                            checked ? 'border-orange-500/40 bg-orange-500/5' : 'hover:bg-muted/40'
                          )}
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={checked}
                            className="mt-0.5"
                            onCheckedChange={(value) =>
                              toggleChangeReason(option.id, value === true)
                            }
                          />
                          <span className="text-foreground min-w-0 flex-1 text-sm font-medium leading-snug">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="text-foreground text-xs font-semibold uppercase tracking-wide">
                    Documents to fix
                  </legend>
                  <div className="space-y-1.5">
                    {changeDocOptions.map((option) => {
                      const checked = selectedDocs.has(option.id);
                      const checkboxId = `request-change-doc-${option.id}`;
                      return (
                        <label
                          key={option.id}
                          htmlFor={checkboxId}
                          className={cn(
                            'border-border flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                            checked ? 'border-orange-500/40 bg-orange-500/5' : 'hover:bg-muted/40'
                          )}
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={checked}
                            onCheckedChange={(value) => toggleDoc(option.id, value === true)}
                          />
                          <span className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-lg">
                            {(() => {
                              const thumbUrl = browserAssetUrl(option.url);
                              if (!thumbUrl) {
                                return (
                                  <span className="text-muted-foreground flex size-full items-center justify-center">
                                    <FileText className="size-4" aria-hidden />
                                  </span>
                                );
                              }
                              return (
                                <VerificationDocThumbnail
                                  url={thumbUrl}
                                  type={getDocType(thumbUrl)}
                                  label={option.label}
                                />
                              );
                            })()}
                          </span>
                          <span className="text-foreground min-w-0 flex-1 text-sm font-medium">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="space-y-1.5">
                  <label
                    htmlFor="request-changes-note"
                    className="text-foreground text-xs font-semibold"
                  >
                    Additional notes
                  </label>
                  <Textarea
                    id="request-changes-note"
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    placeholder="Optional details for the host…"
                    className="min-h-[88px]"
                  />
                </div>

                <div
                  className={cn(
                    'rounded-xl border px-3.5 py-3',
                    changesMessage
                      ? 'border-orange-500/30 bg-orange-500/5'
                      : 'border-border bg-muted/30 border-dashed'
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-800/80">
                    Host will see
                  </p>
                  {changesMessage ? (
                    <p className="text-foreground mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                      {changesMessage}
                    </p>
                  ) : (
                    <p className="text-muted-foreground mt-1.5 text-sm">
                      Select at least one reason
                    </p>
                  )}
                </div>
              </div>
            ) : panel === 'reject' ? (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="reject-reason-select"
                    className="text-foreground text-xs font-semibold"
                  >
                    Rejection reason <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={rejectReasonId || undefined}
                    onValueChange={(value) => setRejectReasonId(value as HostRejectionReasonId)}
                  >
                    <SelectTrigger id="reject-reason-select" className={reasonSelectTriggerClass}>
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent className={reasonSelectContentClass}>
                      {HOST_REJECTION_REASON_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.id}
                          value={option.id}
                          className={reasonSelectItemClass}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="reject-custom-note"
                    className="text-foreground text-xs font-semibold"
                  >
                    Additional notes
                  </label>
                  <Textarea
                    id="reject-custom-note"
                    value={rejectCustomNote}
                    onChange={(e) => setRejectCustomNote(e.target.value)}
                    placeholder="Optional details for the host…"
                    className="min-h-[88px]"
                  />
                </div>

                <div
                  className={cn(
                    'rounded-xl border px-3.5 py-3',
                    rejectMessage
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'border-border bg-muted/30 border-dashed'
                  )}
                >
                  <p className="text-destructive/80 text-[11px] font-semibold uppercase tracking-wide">
                    Host will see
                  </p>
                  {rejectMessage ? (
                    <p className="text-foreground mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                      {rejectMessage}
                    </p>
                  ) : (
                    <p className="text-muted-foreground mt-1.5 text-sm">
                      Select a rejection reason
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {approval.hasPendingConsideration ? (
                  <section className="border-border space-y-3 rounded-xl border p-3">
                    <p className="text-foreground text-xs font-semibold uppercase tracking-wide">
                      Consideration
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['property', approval.propertyConsiderationStatus],
                          ['parking', approval.parkingConsiderationStatus],
                        ] as const
                      )
                        .filter(([, status]) => status === 'pending')
                        .map(([leg]) => (
                          <div key={leg} className="flex flex-wrap gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              className="min-h-[44px]"
                              disabled={decideConsideration.isPending}
                              onClick={() => {
                                void decideConsideration
                                  .mutateAsync({
                                    orgId: approval.organizationId,
                                    leg,
                                    decision: 'grant',
                                  })
                                  .then(() => {
                                    toast.success(`${leg} consideration granted`);
                                    onOpenChange(false);
                                  })
                                  .catch((err: Error) => toast.error(err.message));
                              }}
                            >
                              Grant {leg}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="min-h-[44px]"
                              disabled={decideConsideration.isPending}
                              onClick={() => {
                                void decideConsideration
                                  .mutateAsync({
                                    orgId: approval.organizationId,
                                    leg,
                                    decision: 'deny',
                                  })
                                  .then(() => {
                                    toast.success(`${leg} consideration denied`);
                                    onOpenChange(false);
                                  })
                                  .catch((err: Error) => toast.error(err.message));
                              }}
                            >
                              Deny {leg}
                            </Button>
                          </div>
                        ))}
                    </div>
                  </section>
                ) : null}
                <section className="space-y-3">
                  <p className="text-foreground text-xs font-semibold uppercase tracking-wide">
                    Information
                  </p>
                  <dl className="space-y-2.5">
                    <InfoRow label="Hosting" value={hostModesLabel(hostModes)} />
                    <InfoRow
                      label="Submitted"
                      value={formatApprovalDate(
                        verification.baseSubmittedAt ?? approval.baseSubmittedAt
                      )}
                    />
                    {needsProperty ? (
                      <>
                        <InfoRow
                          label="Property rights"
                          value={rightsLabel(verification.propertyRelationship) ?? 'Rights not set'}
                        />
                        {verification.propertyContractEndDate ? (
                          <InfoRow
                            label="Contract end"
                            value={formatApprovalDate(verification.propertyContractEndDate)}
                          />
                        ) : null}
                        <InfoRow
                          label="Platform"
                          value={platformLabel(verification.socialPlatform) ?? 'Platform not set'}
                        />
                      </>
                    ) : null}
                    {needsParking ? (
                      <>
                        <InfoRow
                          label="Parking rights"
                          value={rightsLabel(verification.parkingRelationship) ?? 'Rights not set'}
                        />
                        {verification.parkingContractEndDate ? (
                          <InfoRow
                            label="Parking end"
                            value={formatApprovalDate(verification.parkingContractEndDate)}
                          />
                        ) : null}
                      </>
                    ) : null}
                  </dl>
                </section>

                <UnitConflictList conflicts={unitConflicts} />

                <section className="space-y-3">
                  <p className="text-foreground text-xs font-semibold uppercase tracking-wide">
                    Documents
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DocPreviewCard
                      label="Valid ID"
                      url={detail.assetUrls.validIdUrl}
                      onFullView={setFullView}
                    />
                    {needsProperty ? (
                      <>
                        <DocPreviewCard
                          label={
                            platformLabel(verification.socialPlatform)
                              ? `${platformLabel(verification.socialPlatform)} access`
                              : 'Listing access'
                          }
                          url={detail.assetUrls.socialProofUrl}
                          onFullView={setFullView}
                        />
                        <DocPreviewCard
                          label="Ownership / management"
                          url={detail.assetUrls.propertyOwnershipProofUrl}
                          onFullView={setFullView}
                        />
                      </>
                    ) : null}
                    {needsParking ? (
                      <DocPreviewCard
                        label="Parking ownership / management"
                        url={detail.assetUrls.parkingSocialProofUrl}
                        onFullView={setFullView}
                      />
                    ) : null}
                  </div>
                </section>

                {status === 'rejected' && verification.baseRejectionReason ? (
                  <div
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-xs leading-relaxed',
                      verification.baseRejectionKind === 'changes'
                        ? 'border-orange-500/25 bg-orange-500/5 text-orange-950'
                        : 'border-destructive/25 bg-destructive/5 text-destructive'
                    )}
                  >
                    <p className="font-semibold">
                      {verification.baseRejectionKind === 'changes'
                        ? 'Changes requested'
                        : 'Rejection reason'}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{verification.baseRejectionReason}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <ResponsiveModalFooter className="border-border bg-background shrink-0 flex-col gap-2 border-t px-5 py-3.5 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6 sm:py-4">
            {decided ? (
              <Button type="button" variant="outline" onClick={close}>
                Close
              </Button>
            ) : panel === 'changes' ? (
              <>
                <Button type="button" variant="outline" onClick={backToReview} disabled={busy}>
                  Back
                </Button>
                <Button
                  type="button"
                  className="bg-orange-600 text-white hover:bg-orange-700"
                  disabled={busy || !changesMessage}
                  onClick={() => void handleRequestChanges()}
                >
                  {rejectMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    'Request changes'
                  )}
                </Button>
              </>
            ) : panel === 'reject' ? (
              <>
                <Button type="button" variant="outline" onClick={backToReview} disabled={busy}>
                  Back
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy || !rejectMessage}
                  onClick={() => void handleReject()}
                >
                  {rejectMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Rejecting…
                    </>
                  ) : (
                    'Confirm reject'
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="border-orange-500/35 text-orange-800 hover:bg-orange-500/10 hover:text-orange-900"
                  onClick={() => setPanel('changes')}
                  disabled={busy || isLoading || !detail}
                >
                  Request changes
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setPanel('reject')}
                  disabled={busy}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  disabled={busy || isLoading}
                  onClick={() => void requestApprove()}
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Approving…
                    </>
                  ) : (
                    'Approve'
                  )}
                </Button>
              </>
            )}
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <AlertDialogContent
          className={cn(
            'max-h-[min(90dvh,32rem)] max-w-[min(calc(100vw-1.5rem),28rem)] overflow-y-auto'
          )}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Approve succession?</AlertDialogTitle>
            <AlertDialogDescription>
              {successionConfirmMessage(unitConflicts)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="min-h-[44px]" disabled={busy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px]"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void handleApprove();
              }}
            >
              {approveMutation.isPending ? 'Approving…' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {fullView ? <FullViewDialog asset={fullView} onClose={() => setFullView(null)} /> : null}
    </>
  );
}
