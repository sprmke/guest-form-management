import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { useParams } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, ChevronDown, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { OnboardingHostAccessVerificationSection } from '@/features/dashboard/org/components/onboarding/OnboardingHostAccessVerificationSection';
import { OnboardingHostVerificationSection } from '@/features/dashboard/org/components/onboarding/OnboardingHostVerificationSection';
import { OnboardingParkingVerificationSection } from '@/features/dashboard/org/components/onboarding/OnboardingParkingVerificationSection';
import { OnboardingProofUpload } from '@/features/dashboard/org/components/onboarding/OnboardingProofUpload';
import { VerificationFieldLabel } from '@/features/dashboard/org/components/onboarding/VerificationFieldLabel';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { VerificationChecklist } from '@/features/dashboard/org/components/verification/VerificationChecklist';
import { VerificationStatusBadge } from '@/features/dashboard/org/components/verification/VerificationStatusBadge';
import { VerificationTierProgress } from '@/features/dashboard/org/components/verification/VerificationTierProgress';
import {
  ORGANIZATIONS_QUERY_KEY,
  useOrganizations,
} from '@/features/dashboard/org/hooks/useOrganizations';
import { callEdgeFunction, getSessionJwt } from '@/features/dashboard/org/lib/edgeClient';
import {
  ORG_SOCIAL_PROOF_PLATFORMS,
  propertyAccessScreenshotHelp,
  todayManilaYmd,
  validateVerificationContractEndDate,
  validateVerificationFile,
  verificationRightsNeedsContractEnd,
  verificationRightsProofHelp,
  shouldShowGetVerifiedCta,
  type OrgSocialProofPlatform,
  type OrgVerificationRights,
  type VerificationSectionKind,
} from '@/features/dashboard/org/lib/orgVerification';
import {
  buildHostTierChecklist,
  buildVerificationTiers,
  canSubmitHostTier,
  canSubmitVerifiedTier,
  isHostVerificationChangesRequestedFromDetail,
  isHostVerificationHardRejectedFromDetail,
  readOrgVerificationDetail,
  resolveHostModes,
  verificationSidebarLabel,
  type OrgVerificationChangeDocId,
  type VerificationTierDefinition,
} from '@/features/dashboard/org/lib/orgVerificationTiers';
import { resolveHostChangesRequestedDocs } from '@/features/dashboard/super-admin/lib/requestChangesMessage';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

type ProofSlot = {
  file: File | null;
  previewUrl: string | null;
  path: string | null;
};

const emptySlot = (): ProofSlot => ({ file: null, previewUrl: null, path: null });

function useCurrentOrganization() {
  const { data } = useOrganizations();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const orgContext = useOptionalOrgContext();
  const slug = orgSlug ?? orgContext?.org.slug;
  const bySlug = data?.organizations.find((o) => o.slug === slug);
  return bySlug ?? orgContext?.org ?? data?.organizations[0] ?? null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, host cannot dismiss — must Resubmit (changes requested). */
  forced?: boolean;
};

async function uploadVerificationAsset(
  orgId: string,
  assetType: string,
  file: File
): Promise<{ path: string; previewUrl: string | null }> {
  const jwt = await getSessionJwt();
  const body = new FormData();
  body.append('orgId', orgId);
  body.append('assetType', assetType);
  body.append('file', file);
  body.append('fileName', file.name);

  const res = await fetch(`${FUNCTIONS_URL}/upload-org-verification-asset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body,
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { path: string; previewUrl: string | null };
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Upload failed');
  }
  return json.data;
}

function slotReady(slot: ProofSlot): boolean {
  return Boolean(slot.file || slot.path);
}

function slotRequiredError(touched: boolean, submitting: boolean, slot: ProofSlot): string | null {
  if (!touched || submitting || slotReady(slot)) return null;
  return 'Required';
}

function verificationRightsError(
  value: OrgVerificationRights | '',
  kind: VerificationSectionKind
): string | null {
  if (!value) {
    return kind === 'parking' ? 'Select parking rights' : 'Select property rights';
  }
  return null;
}

function handleVerificationRightsChange(
  value: OrgVerificationRights,
  setRights: (value: OrgVerificationRights) => void,
  setContractEndDate: Dispatch<SetStateAction<string>>
) {
  setRights(value);
  if (verificationRightsNeedsContractEnd(value)) {
    setContractEndDate((prev) => prev || todayManilaYmd());
  } else {
    setContractEndDate('');
  }
}

function HostTierSummary({
  tier,
  checklist,
  pendingNote,
  rejectionReason,
  rejectionKind,
  forceExpanded = false,
  children,
}: {
  tier: VerificationTierDefinition;
  checklist: ReturnType<typeof buildHostTierChecklist>;
  pendingNote: boolean;
  rejectionReason: string | null;
  rejectionKind: 'changes' | 'rejected' | null;
  forceExpanded?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(tier.status === 'rejected' || forceExpanded);
  const doneCount = checklist.filter((item) => item.complete).length;
  const isResubmit = Boolean(children);
  const expanded = forceExpanded || open;

  return (
    <Collapsible open={expanded} onOpenChange={forceExpanded ? () => {} : setOpen}>
      <div className="border-border bg-muted/30 rounded-xl border">
        <CollapsibleTrigger asChild disabled={forceExpanded}>
          <button
            type="button"
            disabled={forceExpanded}
            className={cn(
              'flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors',
              forceExpanded ? 'cursor-default' : 'hover:bg-muted/50'
            )}
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                tier.status === 'approved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-background text-muted-foreground border-border border'
              )}
              aria-hidden
            >
              {tier.status === 'approved' ? (
                <Check className="size-3.5" strokeWidth={2.5} />
              ) : (
                tier.level
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-foreground flex flex-wrap items-center gap-2 text-sm font-semibold">
                {tier.title}
                <VerificationStatusBadge status={tier.status} kind={rejectionKind} />
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                {tier.status === 'approved'
                  ? 'Required to host — complete'
                  : `${doneCount}/${checklist.length} docs · Required to host`}
              </span>
            </span>
            <ChevronDown
              className={cn(
                'text-muted-foreground size-4 shrink-0 transition-transform',
                expanded && 'rotate-180',
                forceExpanded && 'invisible'
              )}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-border space-y-3 border-t px-4 py-3">
            {isResubmit ? (
              <>
                {rejectionReason ? (
                  <div
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-xs leading-relaxed',
                      rejectionKind === 'changes'
                        ? 'border-orange-500/25 bg-orange-500/5 text-orange-950'
                        : 'border-destructive/25 bg-destructive/5 text-destructive'
                    )}
                  >
                    <p className="font-semibold">
                      {rejectionKind === 'changes' ? 'Changes requested' : 'Rejection reason'}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{rejectionReason}</p>
                  </div>
                ) : null}
                {children}
              </>
            ) : (
              <>
                <VerificationChecklist items={checklist} compact />
                {pendingNote ? (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Submitted during onboarding. Review usually takes a few hours up to 3 days.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function GetVerifiedModal({ open, onOpenChange, forced = false }: Props) {
  const queryClient = useQueryClient();
  const org = useCurrentOrganization();
  const detail = readOrgVerificationDetail(org?.settings);
  const hostModes = resolveHostModes(org);
  const tiers = buildVerificationTiers(detail);
  const hostChecklist = buildHostTierChecklist(detail, hostModes);

  const needsProperty = hostModes.includes('property');
  const needsParking = hostModes.includes('parking');
  const hostRejected = detail.baseStatus === 'rejected';
  const hostChangesRequested = isHostVerificationChangesRequestedFromDetail(detail);
  const hostHardRejected = isHostVerificationHardRejectedFromDetail(detail);
  const blockDismiss = forced || hostChangesRequested;
  const changesDocs = hostChangesRequested
    ? resolveHostChangesRequestedDocs({
        stored: detail.baseChangesRequestedDocs,
        reason: detail.baseRejectionReason,
        hostModes,
      })
    : ([] as OrgVerificationChangeDocId[]);
  /** Empty list = legacy full form; otherwise only those docs. */
  const showAllChangeDocs = hostChangesRequested && changesDocs.length === 0;
  const fixValidId = hostChangesRequested && (showAllChangeDocs || changesDocs.includes('validId'));
  const fixSocialProof =
    hostChangesRequested &&
    needsProperty &&
    (showAllChangeDocs || changesDocs.includes('socialProof'));
  const fixPropertyOwnership =
    hostChangesRequested &&
    needsProperty &&
    (showAllChangeDocs || changesDocs.includes('propertyOwnership'));
  const fixParkingProof =
    hostChangesRequested &&
    needsParking &&
    (showAllChangeDocs || changesDocs.includes('parkingProof'));
  const showFullPropertyResubmit = showAllChangeDocs || (fixSocialProof && fixPropertyOwnership);
  const showFullParkingResubmit = showAllChangeDocs && fixParkingProof;

  const handleOpenChange = (next: boolean) => {
    if (blockDismiss && !next) return;
    onOpenChange(next);
  };

  const [validId, setValidId] = useState<ProofSlot>(emptySlot);
  const [socialProof, setSocialProof] = useState<ProofSlot>(emptySlot);
  const [propertyOwnership, setPropertyOwnership] = useState<ProofSlot>(emptySlot);
  const [parkingProof, setParkingProof] = useState<ProofSlot>(emptySlot);
  const [socialPlatform, setSocialPlatform] = useState<OrgSocialProofPlatform | ''>('');
  const [propertyRights, setPropertyRights] = useState<OrgVerificationRights | ''>('');
  const [propertyContractEndDate, setPropertyContractEndDate] = useState('');
  const [parkingRights, setParkingRights] = useState<OrgVerificationRights | ''>('');
  const [parkingContractEndDate, setParkingContractEndDate] = useState('');

  const [selfie, setSelfie] = useState<ProofSlot>(emptySlot);
  const [ownership, setOwnership] = useState<ProofSlot>(emptySlot);
  const [pmo1, setPmo1] = useState<ProofSlot>(emptySlot);
  const [pmo2, setPmo2] = useState<ProofSlot>(emptySlot);
  const [submitting, setSubmitting] = useState<'base' | 'enhanced' | null>(null);
  const [hostTouched, setHostTouched] = useState(false);
  const [verifiedTouched, setVerifiedTouched] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !org) return;
    const next = readOrgVerificationDetail(org.settings);
    const modes = resolveHostModes(org);
    const docs = isHostVerificationChangesRequestedFromDetail(next)
      ? resolveHostChangesRequestedDocs({
          stored: next.baseChangesRequestedDocs,
          reason: next.baseRejectionReason,
          hostModes: modes,
        })
      : [];
    const showAll = isHostVerificationChangesRequestedFromDetail(next) && docs.length === 0;
    const clearValidId = showAll || docs.includes('validId');
    const clearSocial = showAll || docs.includes('socialProof');
    const clearOwnership = showAll || docs.includes('propertyOwnership');
    const clearParking = showAll || docs.includes('parkingProof');

    setValidId({
      file: null,
      previewUrl: null,
      path: clearValidId ? null : next.assets.validIdPath,
    });
    setSocialProof({
      file: null,
      previewUrl: null,
      path: clearSocial ? null : next.assets.socialProofPath,
    });
    setPropertyOwnership({
      file: null,
      previewUrl: null,
      path: clearOwnership ? null : next.assets.propertyOwnershipProofPath,
    });
    setParkingProof({
      file: null,
      previewUrl: null,
      path: clearParking ? null : next.assets.parkingSocialProofPath,
    });
    setSocialPlatform(next.socialPlatform ?? '');
    setPropertyRights(next.propertyRelationship ?? '');
    setPropertyContractEndDate(next.propertyContractEndDate ?? '');
    setParkingRights(next.parkingRelationship ?? '');
    setParkingContractEndDate(next.parkingContractEndDate ?? '');
    setSelfie({ file: null, previewUrl: null, path: next.assets.selfieWithIdPath });
    setOwnership({ file: null, previewUrl: null, path: next.assets.ownershipProofPath });
    setPmo1({
      file: null,
      previewUrl: null,
      path: next.assets.pmoEmailPaths[0] ?? null,
    });
    setPmo2({
      file: null,
      previewUrl: null,
      path: next.assets.pmoEmailPaths[1] ?? null,
    });
    setHostTouched(false);
    setVerifiedTouched(false);
    setUploadError(null);
  }, [open, org]);

  const hostTier = tiers[0]!;
  const verifiedTier = tiers[1]!;
  const verifiedApproved = verifiedTier.status === 'approved';
  const verifiedPending = verifiedTier.status === 'pending';
  const verifiedEditable = !verifiedApproved && !verifiedPending;

  const canSubmitHost = canSubmitHostTier(
    detail,
    hostModes,
    {
      // After upload, file is cleared and path is set — treat path as ready so Resubmit
      // stays enabled if submit fails (modal open still clears flagged paths on open).
      validId: slotReady(validId),
      socialProof: slotReady(socialProof),
      propertyOwnership: slotReady(propertyOwnership),
      parkingProof: slotReady(parkingProof),
      socialPlatform,
      propertyRights,
      propertyContractEndDate,
      parkingRights,
      parkingContractEndDate,
    },
    hostChangesRequested && changesDocs.length > 0
      ? { changesRequestedDocs: changesDocs }
      : undefined
  );

  const canSubmitVerified = canSubmitVerifiedTier(detail, {
    selfie: slotReady(selfie),
    ownership: slotReady(ownership),
    pmo: slotReady(pmo1),
  });

  const propertyContractEndError =
    hostTouched && needsProperty && verificationRightsNeedsContractEnd(propertyRights)
      ? validateVerificationContractEndDate(propertyContractEndDate)
      : null;
  const parkingContractEndError =
    hostTouched && needsParking && verificationRightsNeedsContractEnd(parkingRights)
      ? validateVerificationContractEndDate(parkingContractEndDate)
      : null;

  const setSlot = (setter: typeof setSelfie) => (file: File | null, previewUrl: string | null) => {
    if (file) {
      const err = validateVerificationFile(file);
      if (err) {
        toast.error(err);
        setter(emptySlot());
        return;
      }
    }
    setter({ file, previewUrl, path: null });
  };

  const handleSubmitHost = async () => {
    setHostTouched(true);
    setUploadError(null);
    if (!org || !canSubmitHost) return;
    setSubmitting('base');
    try {
      if (validId.file) {
        const uploaded = await uploadVerificationAsset(org.id, 'valid_id', validId.file);
        setValidId({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }
      if (needsProperty && socialProof.file) {
        const uploaded = await uploadVerificationAsset(org.id, 'social_proof', socialProof.file);
        setSocialProof({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }
      if (needsProperty && propertyOwnership.file) {
        const uploaded = await uploadVerificationAsset(
          org.id,
          'property_ownership_proof',
          propertyOwnership.file
        );
        setPropertyOwnership({
          file: null,
          previewUrl: uploaded.previewUrl,
          path: uploaded.path,
        });
      }
      if (needsParking && parkingProof.file) {
        const uploaded = await uploadVerificationAsset(
          org.id,
          'parking_social_proof',
          parkingProof.file
        );
        setParkingProof({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }

      await callEdgeFunction('submit-org-verification', {
        method: 'POST',
        body: JSON.stringify({
          orgId: org.id,
          tier: 'base',
          ...(needsProperty && {
            socialPlatform,
            propertyRelationship: propertyRights,
            ...(verificationRightsNeedsContractEnd(propertyRights) && {
              propertyContractEndDate,
            }),
          }),
          ...(needsParking && {
            parkingRelationship: parkingRights,
            ...(verificationRightsNeedsContractEnd(parkingRights) && {
              parkingContractEndDate,
            }),
          }),
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
      toast.success('Host verification resubmitted');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubmitVerified = async () => {
    setVerifiedTouched(true);
    if (!org || !canSubmitVerified) return;
    setSubmitting('enhanced');
    try {
      if (selfie.file) {
        const uploaded = await uploadVerificationAsset(org.id, 'selfie_with_id', selfie.file);
        setSelfie({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }
      if (ownership.file) {
        const uploaded = await uploadVerificationAsset(org.id, 'ownership_proof', ownership.file);
        setOwnership({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }
      if (pmo1.file) {
        const uploaded = await uploadVerificationAsset(org.id, 'pmo_email_1', pmo1.file);
        setPmo1({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }
      if (pmo2.file) {
        const uploaded = await uploadVerificationAsset(org.id, 'pmo_email_2', pmo2.file);
        setPmo2({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }

      await callEdgeFunction('submit-org-verification', {
        method: 'POST',
        body: JSON.stringify({ orgId: org.id, tier: 'enhanced' }),
      });
      await queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
      toast.success('Verified tier submitted');
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!blockDismiss}
        onPointerDownOutside={(event) => {
          if (blockDismiss) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (blockDismiss) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (blockDismiss) event.preventDefault();
        }}
        className={cn(
          'flex h-[min(90dvh,40rem)] max-h-[min(90dvh,40rem)] w-[min(calc(100vw-1.5rem),40rem)] max-w-none flex-col gap-0 overflow-hidden p-0',
          'sm:h-[min(90dvh,42rem)] sm:max-h-[min(90dvh,42rem)] sm:w-[min(92vw,40rem)] sm:max-w-[40rem] sm:p-0'
        )}
      >
        <DialogHeader
          className={cn(
            'border-border shrink-0 space-y-4 border-b px-5 pb-4 pt-5 text-left sm:px-6',
            blockDismiss && 'pr-5 sm:pr-6'
          )}
        >
          <DialogTitle className="flex items-center gap-2.5 text-left text-lg font-semibold sm:text-lg">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
              <BadgeCheck className="size-5" aria-hidden />
            </span>
            {hostChangesRequested ? 'Changes requested' : 'Get Verified'}
          </DialogTitle>
          {!blockDismiss ? <VerificationTierProgress tiers={tiers} /> : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          <div className="space-y-4 pb-1">
            <HostTierSummary
              tier={hostTier}
              checklist={hostChecklist}
              pendingNote={detail.baseStatus === 'pending'}
              rejectionReason={hostRejected ? detail.baseRejectionReason : null}
              rejectionKind={hostRejected ? detail.baseRejectionKind : null}
              forceExpanded={hostChangesRequested}
            >
              {hostChangesRequested ? (
                <div className="space-y-4">
                  {fixValidId ? (
                    <OnboardingHostVerificationSection
                      file={validId.file}
                      previewUrl={validId.previewUrl}
                      error={slotRequiredError(hostTouched, submitting !== null, validId)}
                      onFileChange={(file, preview) => {
                        setValidId({ file, previewUrl: preview, path: file ? null : validId.path });
                      }}
                      onUploadError={(message) => {
                        setUploadError(message);
                        if (message) toast.error(message);
                      }}
                    />
                  ) : null}
                  {showFullPropertyResubmit ? (
                    <OnboardingHostAccessVerificationSection
                      sectionId="host-resubmit-property"
                      title="Property verification"
                      subtitle="Update the docs that need fixing."
                      rights={propertyRights}
                      onRightsChange={(value) =>
                        handleVerificationRightsChange(
                          value,
                          setPropertyRights,
                          setPropertyContractEndDate
                        )
                      }
                      rightsError={
                        hostTouched ? verificationRightsError(propertyRights, 'property') : null
                      }
                      contractEndDate={propertyContractEndDate}
                      onContractEndDateChange={setPropertyContractEndDate}
                      contractEndDateError={propertyContractEndError}
                      proofFile={propertyOwnership.file}
                      proofPreview={propertyOwnership.previewUrl}
                      proofError={slotRequiredError(
                        hostTouched,
                        submitting !== null,
                        propertyOwnership
                      )}
                      onProofChange={(file, preview) => {
                        setPropertyOwnership({
                          file,
                          previewUrl: preview,
                          path: file ? null : propertyOwnership.path,
                        });
                      }}
                      platformLabel="Property platform"
                      platformHelp="Choose where you market your property."
                      platformValue={socialPlatform}
                      onPlatformChange={setSocialPlatform}
                      platformError={hostTouched && !socialPlatform ? 'Select a platform' : null}
                      screenshotFile={socialProof.file}
                      screenshotPreview={socialProof.previewUrl}
                      screenshotError={slotRequiredError(
                        hostTouched,
                        submitting !== null,
                        socialProof
                      )}
                      onScreenshotChange={(file, preview) => {
                        setSocialProof({
                          file,
                          previewUrl: preview,
                          path: file ? null : socialProof.path,
                        });
                      }}
                      onUploadError={(message) => {
                        setUploadError(message);
                        if (message) toast.error(message);
                      }}
                    />
                  ) : (
                    <>
                      {fixPropertyOwnership ? (
                        <OnboardingProofUpload
                          id="host-resubmit-property-ownership"
                          label="Ownership / management"
                          help={verificationRightsProofHelp(propertyRights || '', 'property')}
                          file={propertyOwnership.file}
                          previewUrl={propertyOwnership.previewUrl}
                          error={slotRequiredError(
                            hostTouched,
                            submitting !== null,
                            propertyOwnership
                          )}
                          onFileChange={(file, preview) => {
                            if (file) {
                              const err = validateVerificationFile(file);
                              if (err) {
                                setUploadError(err);
                                toast.error(err);
                                return;
                              }
                            }
                            setUploadError(null);
                            setPropertyOwnership({
                              file,
                              previewUrl: preview,
                              path: file ? null : propertyOwnership.path,
                            });
                          }}
                        />
                      ) : null}
                      {fixSocialProof ? (
                        <div className="space-y-4">
                          <SocialPlatformSelect
                            id="host-resubmit-platform"
                            label="Property platform"
                            help="Choose where you market your property."
                            value={socialPlatform}
                            onChange={setSocialPlatform}
                            error={hostTouched && !socialPlatform ? 'Select a platform' : null}
                          />
                          <OnboardingProofUpload
                            id="host-resubmit-social-proof"
                            label="Listing access"
                            help={propertyAccessScreenshotHelp(socialPlatform, 'property')}
                            file={socialProof.file}
                            previewUrl={socialProof.previewUrl}
                            error={slotRequiredError(hostTouched, submitting !== null, socialProof)}
                            onFileChange={(file, preview) => {
                              if (file) {
                                const err = validateVerificationFile(file);
                                if (err) {
                                  setUploadError(err);
                                  toast.error(err);
                                  return;
                                }
                              }
                              setUploadError(null);
                              setSocialProof({
                                file,
                                previewUrl: preview,
                                path: file ? null : socialProof.path,
                              });
                            }}
                          />
                        </div>
                      ) : null}
                    </>
                  )}
                  {showFullParkingResubmit ? (
                    <OnboardingParkingVerificationSection
                      rights={parkingRights}
                      onRightsChange={(value) =>
                        handleVerificationRightsChange(
                          value,
                          setParkingRights,
                          setParkingContractEndDate
                        )
                      }
                      rightsError={
                        hostTouched ? verificationRightsError(parkingRights, 'parking') : null
                      }
                      contractEndDate={parkingContractEndDate}
                      onContractEndDateChange={setParkingContractEndDate}
                      contractEndDateError={parkingContractEndError}
                      proofFile={parkingProof.file}
                      proofPreview={parkingProof.previewUrl}
                      proofError={slotRequiredError(hostTouched, submitting !== null, parkingProof)}
                      onProofChange={(file, preview) => {
                        setParkingProof({
                          file,
                          previewUrl: preview,
                          path: file ? null : parkingProof.path,
                        });
                      }}
                      onUploadError={(message) => {
                        setUploadError(message);
                        if (message) toast.error(message);
                      }}
                    />
                  ) : fixParkingProof ? (
                    <OnboardingProofUpload
                      id="host-resubmit-parking-proof"
                      label="Parking ownership / management"
                      help={verificationRightsProofHelp(parkingRights || '', 'parking')}
                      file={parkingProof.file}
                      previewUrl={parkingProof.previewUrl}
                      error={slotRequiredError(hostTouched, submitting !== null, parkingProof)}
                      onFileChange={(file, preview) => {
                        if (file) {
                          const err = validateVerificationFile(file);
                          if (err) {
                            setUploadError(err);
                            toast.error(err);
                            return;
                          }
                        }
                        setUploadError(null);
                        setParkingProof({
                          file,
                          previewUrl: preview,
                          path: file ? null : parkingProof.path,
                        });
                      }}
                    />
                  ) : null}
                  {uploadError ? (
                    <p role="alert" className="text-destructive text-xs">
                      {uploadError}
                    </p>
                  ) : null}
                </div>
              ) : hostHardRejected ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  This verification was declined. Start a new application to try again with updated
                  documents.
                </p>
              ) : null}
            </HostTierSummary>

            {!hostChangesRequested ? (
              <section
                className={cn(
                  'bg-card rounded-xl border p-4 sm:p-5',
                  verifiedEditable ? 'border-primary/35 shadow-sm' : 'border-border'
                )}
                aria-labelledby="verification-tier-verified-title"
              >
                <header className="mb-4 flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      verifiedApproved
                        ? 'bg-emerald-600 text-white'
                        : verifiedPending
                          ? 'border-2 border-amber-500 bg-amber-50 text-amber-700'
                          : 'bg-primary text-primary-foreground'
                    )}
                    aria-hidden
                  >
                    {verifiedApproved ? (
                      <Check className="size-3.5" strokeWidth={2.5} />
                    ) : (
                      verifiedTier.level
                    )}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        id="verification-tier-verified-title"
                        className="text-foreground text-[15px] font-semibold leading-tight"
                      >
                        {verifiedTier.title}
                      </h3>
                      <VerificationStatusBadge
                        status={verifiedTier.status}
                        kind={detail.enhancedRejectionKind}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {verifiedTier.benefit}
                    </p>
                  </div>
                </header>

                {verifiedApproved ? (
                  <p className="text-foreground text-sm font-medium">
                    Verified badge is live on your host page and listings.
                  </p>
                ) : verifiedPending ? (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Tier 2 is in review. You can submit without waiting for Tier 1.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {detail.enhancedStatus === 'rejected' ? (
                      <div
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-xs leading-relaxed',
                          detail.enhancedRejectionKind === 'changes'
                            ? 'border-orange-500/25 bg-orange-500/5 text-orange-950'
                            : 'border-destructive/25 bg-destructive/5 text-destructive'
                        )}
                      >
                        <p className="font-semibold">
                          {detail.enhancedRejectionKind === 'changes'
                            ? 'Changes requested'
                            : 'Rejection reason'}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">
                          {detail.enhancedRejectionReason ??
                            'Replace the documents below and submit again.'}
                        </p>
                      </div>
                    ) : null}
                    <OnboardingProofUpload
                      id="enhanced-selfie"
                      label="Selfie with valid ID"
                      help="Hold your valid ID next to your face in one photo so we can match you to the ID."
                      file={selfie.file}
                      previewUrl={selfie.previewUrl}
                      error={verifiedTouched && !slotReady(selfie) ? 'Required' : null}
                      onFileChange={setSlot(setSelfie)}
                    />
                    <OnboardingProofUpload
                      id="enhanced-ownership"
                      label="Ownership or sublease proof"
                      help="Upload a unit ownership certificate, or an email from Azure acknowledging your sublease."
                      file={ownership.file}
                      previewUrl={ownership.previewUrl}
                      error={verifiedTouched && !slotReady(ownership) ? 'Required' : null}
                      onFileChange={setSlot(setOwnership)}
                    />
                    <OnboardingProofUpload
                      id="enhanced-pmo-1"
                      label="Azure PMO email screenshot"
                      help="Screenshot of a past email thread with Azure PMO about your unit (dates and address visible)."
                      file={pmo1.file}
                      previewUrl={pmo1.previewUrl}
                      error={verifiedTouched && !slotReady(pmo1) ? 'Required' : null}
                      onFileChange={setSlot(setPmo1)}
                    />
                    <OnboardingProofUpload
                      id="enhanced-pmo-2"
                      label="Second PMO screenshot"
                      help="Optional second email screenshot if you have another PMO thread."
                      required={false}
                      file={pmo2.file}
                      previewUrl={pmo2.previewUrl}
                      onFileChange={setSlot(setPmo2)}
                    />
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </div>

        <DialogFooter className="border-border bg-background shrink-0 gap-2 border-t px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          {!blockDismiss ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting !== null}
            >
              Close
            </Button>
          ) : null}
          {hostChangesRequested ? (
            <Button
              type="button"
              disabled={submitting !== null || !canSubmitHost}
              onClick={() => void handleSubmitHost()}
              className="min-h-[44px] min-w-[8.5rem]"
            >
              {submitting === 'base' ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Submitting…
                </>
              ) : (
                'Resubmit'
              )}
            </Button>
          ) : null}
          {!hostChangesRequested && verifiedEditable ? (
            <Button
              type="button"
              disabled={submitting !== null || !canSubmitVerified}
              onClick={() => void handleSubmitVerified()}
              className="min-h-[44px] min-w-[8.5rem]"
            >
              {submitting === 'enhanced' ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Submitting…
                </>
              ) : (
                'Submit for review'
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GetVerifiedSidebarCta({ collapsed }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const org = useCurrentOrganization();
  const detail = readOrgVerificationDetail(org?.settings);
  const forced = isHostVerificationChangesRequestedFromDetail(detail);

  if (!org || !shouldShowGetVerifiedCta(detail)) return null;

  const label = verificationSidebarLabel(detail);

  return (
    <>
      <div
        className={cn('border-sidebar-border shrink-0 border-t py-3', collapsed ? 'px-2' : 'px-3')}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={collapsed ? label : undefined}
          className={cn(
            'border-primary/20 bg-primary/[0.06] text-primary hover:bg-primary/10 flex min-h-[44px] w-full items-center rounded-xl border transition-colors',
            collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2.5'
          )}
        >
          <Shield className="size-4 shrink-0" aria-hidden />
          {!collapsed ? (
            <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">{label}</span>
          ) : null}
        </button>
      </div>
      {/* Forced modal is mounted once via HostVerificationChangesGate (avoids mobile+desktop double mount). */}
      {!forced ? <GetVerifiedModal open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}

/** Non-dismissible Get Verified when Tier 1 has changes requested — mount once in AdminLayout. */
export function HostVerificationChangesGate() {
  const org = useCurrentOrganization();
  const detail = readOrgVerificationDetail(org?.settings);
  if (!org || !isHostVerificationChangesRequestedFromDetail(detail)) return null;
  // Members cannot upload/resubmit — don't trap them. Owners and platform/super-admins
  // (list-organizations returns accessKind: platform_admin for SUPER_ADMIN_EMAILS) must see the modal.
  if (org.accessKind === 'org_admin' || org.accessKind === 'property_member') return null;
  return <GetVerifiedModal open forced onOpenChange={() => {}} />;
}

/** Property or parking platform + access proof for onboarding base verification */
export function SocialPlatformSelect({
  id = 'social-platform',
  label = 'Platform',
  help = 'Choose the platform where you host or market — Facebook Page, Instagram, or Airbnb. We use this to match your access screenshot.',
  value,
  onChange,
  error,
}: {
  id?: string;
  label?: string;
  help?: string;
  value: OrgSocialProofPlatform | '';
  onChange: (value: OrgSocialProofPlatform) => void;
  error?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <VerificationFieldLabel htmlFor={id} label={label} help={help} required />
      <Select
        value={value || undefined}
        onValueChange={(v) => onChange(v as OrgSocialProofPlatform)}
      >
        <SelectTrigger
          id={id}
          className={cn('h-10', error && 'border-destructive')}
          aria-invalid={Boolean(error)}
        >
          <SelectValue placeholder="Facebook, Instagram, or Airbnb" />
        </SelectTrigger>
        <SelectContent>
          {ORG_SOCIAL_PROOF_PLATFORMS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
