import { useEffect, useState, type ReactNode } from 'react';

import { useLocation, useParams } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, BadgeCheck, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  isParkingAdminPath,
  isPropertyAdminPath,
} from '@/features/dashboard/bookings/lib/adminSidebarNav';
import { OrgListingVerificationRollup } from '@/features/dashboard/org/components/listing-authorization/OrgListingVerificationRollup';
import { OnboardingHostVerificationSection } from '@/features/dashboard/org/components/onboarding/OnboardingHostVerificationSection';
import { OnboardingProofUpload } from '@/features/dashboard/org/components/onboarding/OnboardingProofUpload';
import { VerificationFieldLabel } from '@/features/dashboard/org/components/onboarding/VerificationFieldLabel';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { RecommendedBadgePreview } from '@/features/dashboard/org/components/verification/RecommendedBadgePreview';
import { VerificationChecklist } from '@/features/dashboard/org/components/verification/VerificationChecklist';
import { VerificationTier1SubmittedDocs } from '@/features/dashboard/org/components/verification/VerificationTier1SubmittedDocs';
import {
  defaultVerificationStepIndex,
  VerificationTierProgress,
} from '@/features/dashboard/org/components/verification/VerificationTierProgress';
import {
  ORGANIZATIONS_QUERY_KEY,
  useOrganizations,
} from '@/features/dashboard/org/hooks/useOrganizations';
import { handleAiMutationError, isAiQuotaError } from '@/features/dashboard/org/lib/aiQuotaToast';
import { callEdgeFunction, getSessionJwt } from '@/features/dashboard/org/lib/edgeClient';
import {
  ORG_SOCIAL_PROOF_PLATFORMS,
  propertyAccessScreenshotHelp,
  validateVerificationFile,
  shouldShowGetVerifiedCta,
  type OrgSocialProofPlatform,
  type OrgVerificationStatus,
} from '@/features/dashboard/org/lib/orgVerification';
import {
  buildHostTierChecklist,
  buildVerifiedTierChecklist,
  recommendedTierDocumentChecklistItems,
  hostTierDocumentChecklistItems,
  buildVerificationTiers,
  canSubmitHostTier,
  canSubmitVerifiedTier,
  isHostVerificationChangesRequestedFromDetail,
  isHostVerificationHardRejectedFromDetail,
  readOrgVerificationDetail,
  resolveHostModes,
  verificationSidebarLabel,
  type VerificationTierDefinition,
} from '@/features/dashboard/org/lib/orgVerificationTiers';
import {
  VERIFICATION_BENEFIT_BULLETS,
  VERIFICATION_REVIEW_TIMELINE,
  VERIFICATION_SIDEBAR_SUBLABEL,
  VERIFICATION_TIER2_APPROVED,
  VERIFICATION_TIER2_DOC_HELP,
  VERIFICATION_TIER2_DOC_LABELS,
} from '@/features/dashboard/org/lib/verificationCopy';
import { useUpgradeModal } from '@/features/dashboard/plans/components/UpgradeModalProvider';
import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';

import { Button } from '@/components/ui/button';
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

function VerificationPendingNote() {
  return (
    <p className="text-muted-foreground text-xs leading-relaxed">{VERIFICATION_REVIEW_TIMELINE}</p>
  );
}

function VerificationFeedbackAlert({
  kind,
  title,
  message,
}: {
  kind: 'changes' | 'rejected';
  title: string;
  message: string;
}) {
  const isChanges = kind === 'changes';

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-xl border px-4 py-3.5',
        isChanges
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-destructive/40 bg-destructive/10'
      )}
    >
      <AlertCircle
        className={cn(
          'mt-0.5 size-5 shrink-0',
          isChanges ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
        )}
        aria-hidden
      />
      <div className="min-w-0 space-y-1">
        <p
          className={cn(
            'text-sm font-semibold leading-snug',
            isChanges ? 'text-amber-900 dark:text-amber-100' : 'text-destructive dark:text-red-200'
          )}
        >
          {title}
        </p>
        <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

function ListingVerificationRollupSection({
  orgId,
  orgSlug,
  modalOpen,
}: {
  orgId?: string;
  orgSlug?: string;
  modalOpen?: boolean;
}) {
  if (!orgId || !orgSlug) return null;
  return (
    <OrgListingVerificationRollup orgId={orgId} orgSlug={orgSlug} enabled={Boolean(modalOpen)} />
  );
}

function VerifiedTierStepPanel({
  tier,
  checklist,
  pendingNote,
  rejectionReason,
  rejectionKind,
  changesResubmit = false,
  orgId,
  orgSlug,
  modalOpen,
  showSubmittedDocs,
  children,
}: {
  tier: VerificationTierDefinition;
  checklist: ReturnType<typeof buildHostTierChecklist>;
  pendingNote: boolean;
  rejectionReason: string | null;
  rejectionKind: 'changes' | 'rejected' | null;
  /** Streamlined layout for forced Tier 1 changes-requested resubmit. */
  changesResubmit?: boolean;
  orgId?: string;
  orgSlug?: string;
  modalOpen?: boolean;
  showSubmittedDocs?: boolean;
  children?: ReactNode;
}) {
  const documentChecklist = hostTierDocumentChecklistItems(checklist);
  const doneCount = documentChecklist.filter((item) => item.complete).length;
  const isResubmit = Boolean(children);
  const approved = tier.status === 'approved';
  const rejected = tier.status === 'rejected';
  const isChangesResubmit = changesResubmit && rejectionKind === 'changes';
  const submittedDocsSection =
    showSubmittedDocs && orgId ? (
      <VerificationTier1SubmittedDocs
        orgId={orgId}
        enabled={Boolean(modalOpen)}
        items={checklist}
        tierStatus={tier.status}
      />
    ) : null;

  if (isChangesResubmit) {
    return (
      <section aria-labelledby="verification-resubmit-title" className="space-y-4">
        <h3 id="verification-resubmit-title" className="sr-only">
          Resubmit verification documents
        </h3>
        {rejectionReason ? (
          <VerificationFeedbackAlert
            kind="changes"
            title="What to update"
            message={rejectionReason}
          />
        ) : null}
        {children}
        {submittedDocsSection ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              Previously submitted
            </p>
            {submittedDocsSection}
          </div>
        ) : null}
        <ListingVerificationRollupSection orgId={orgId} orgSlug={orgSlug} modalOpen={modalOpen} />
      </section>
    );
  }

  if (isResubmit) {
    return (
      <section aria-labelledby="verification-resubmit-title" className="space-y-4">
        <h3 id="verification-resubmit-title" className="sr-only">
          Resubmit verification documents
        </h3>
        {rejectionReason ? (
          <VerificationFeedbackAlert
            kind={rejectionKind === 'changes' ? 'changes' : 'rejected'}
            title={rejectionKind === 'changes' ? 'What to update' : 'Rejection reason'}
            message={rejectionReason}
          />
        ) : null}
        {children}
        {submittedDocsSection}
        <ListingVerificationRollupSection orgId={orgId} orgSlug={orgSlug} modalOpen={modalOpen} />
      </section>
    );
  }

  return (
    <section aria-labelledby="verification-tier-verified-panel-title" className="space-y-4">
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3
            id="verification-tier-verified-panel-title"
            className="text-foreground text-sm font-semibold leading-tight"
          >
            Submitted documents
          </h3>
          <span className="text-muted-foreground text-xs leading-none">
            {doneCount}/{documentChecklist.length} docs
          </span>
        </div>
        {pendingNote ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {VERIFICATION_REVIEW_TIMELINE}
          </p>
        ) : null}
      </div>

      {showSubmittedDocs && orgId ? (
        submittedDocsSection
      ) : (
        <VerificationChecklist items={checklist} compact />
      )}

      {approved ? (
        <p className="text-muted-foreground text-xs leading-relaxed">You can host on Kame Homes.</p>
      ) : null}

      {rejected && rejectionReason ? (
        <VerificationFeedbackAlert
          kind={rejectionKind === 'changes' ? 'changes' : 'rejected'}
          title={rejectionKind === 'changes' ? 'What to update' : 'Rejection reason'}
          message={rejectionReason}
        />
      ) : null}

      <ListingVerificationRollupSection orgId={orgId} orgSlug={orgSlug} modalOpen={modalOpen} />
    </section>
  );
}

function RecommendedTierSubmittedDocs({
  orgId,
  modalOpen,
  checklist,
  tierStatus,
  pendingNote = false,
}: {
  orgId: string;
  modalOpen: boolean;
  checklist: ReturnType<typeof buildVerifiedTierChecklist>;
  tierStatus: OrgVerificationStatus;
  pendingNote?: boolean;
}) {
  const documentChecklist = recommendedTierDocumentChecklistItems(checklist);
  const doneCount = documentChecklist.filter((item) => item.complete).length;

  if (documentChecklist.length === 0) return null;

  return (
    <section aria-labelledby="verification-tier-recommended-docs-title" className="space-y-4">
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3
            id="verification-tier-recommended-docs-title"
            className="text-foreground text-sm font-semibold leading-tight"
          >
            Submitted documents
          </h3>
          <span className="text-muted-foreground text-xs leading-none">
            {doneCount}/{documentChecklist.length} docs
          </span>
        </div>
        {pendingNote ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {VERIFICATION_REVIEW_TIMELINE}
          </p>
        ) : null}
      </div>

      <VerificationTier1SubmittedDocs
        orgId={orgId}
        enabled={modalOpen}
        items={checklist}
        tierStatus={tierStatus}
        tier="recommended"
      />
    </section>
  );
}

function RecommendedTierStepPanel({
  tier,
  orgName,
  orgId,
  orgSlug,
  modalOpen,
  checklist,
  showSubmittedDocs,
  verifiedApproved,
  verifiedPending,
  enhancedStatus,
  enhancedRejectionKind,
  enhancedRejectionReason,
  socialProof,
  selfie,
  platformAdmin,
  platformAdminPlatform,
  legitimacyCheck,
  businessPermit,
  verifiedTouched,
  onSocialProofChange,
  onSelfieChange,
  onPlatformAdminChange,
  onPlatformAdminPlatformChange,
  onLegitimacyCheckChange,
  onBusinessPermitChange,
}: {
  tier: VerificationTierDefinition;
  orgName?: string | null;
  orgId?: string;
  orgSlug?: string;
  modalOpen: boolean;
  checklist: ReturnType<typeof buildVerifiedTierChecklist>;
  showSubmittedDocs: boolean;
  verifiedApproved: boolean;
  verifiedPending: boolean;
  enhancedStatus: OrgVerificationStatus;
  enhancedRejectionKind: 'changes' | 'rejected' | null;
  enhancedRejectionReason: string | null;
  socialProof: ProofSlot;
  selfie: ProofSlot;
  platformAdmin: ProofSlot;
  platformAdminPlatform: OrgSocialProofPlatform | '';
  legitimacyCheck: ProofSlot;
  businessPermit: ProofSlot;
  verifiedTouched: boolean;
  onSocialProofChange: (file: File | null, previewUrl: string | null) => void;
  onSelfieChange: (file: File | null, previewUrl: string | null) => void;
  onPlatformAdminChange: (file: File | null, previewUrl: string | null) => void;
  onPlatformAdminPlatformChange: (value: OrgSocialProofPlatform) => void;
  onLegitimacyCheckChange: (file: File | null, previewUrl: string | null) => void;
  onBusinessPermitChange: (file: File | null, previewUrl: string | null) => void;
}) {
  const submittedDocsSection =
    showSubmittedDocs && orgId ? (
      <RecommendedTierSubmittedDocs
        orgId={orgId}
        modalOpen={modalOpen}
        checklist={checklist}
        tierStatus={tier.status}
        pendingNote={verifiedPending}
      />
    ) : null;

  if (verifiedApproved) {
    return (
      <section aria-labelledby="verification-tier-recommended-panel-title" className="space-y-4">
        <h3
          id="verification-tier-recommended-panel-title"
          className="text-foreground text-sm font-semibold leading-tight"
        >
          Recommended
        </h3>
        {submittedDocsSection ? (
          <>
            {submittedDocsSection}
            <p className="text-muted-foreground text-xs leading-relaxed">
              {VERIFICATION_TIER2_APPROVED}
            </p>
          </>
        ) : (
          <p className="text-foreground text-sm leading-relaxed">{VERIFICATION_TIER2_APPROVED}</p>
        )}
        <ListingVerificationRollupSection orgId={orgId} orgSlug={orgSlug} modalOpen={modalOpen} />
      </section>
    );
  }

  if (verifiedPending) {
    return (
      <section aria-labelledby="verification-tier-recommended-panel-title" className="space-y-4">
        <h3
          id="verification-tier-recommended-panel-title"
          className="text-foreground text-sm font-semibold leading-tight"
        >
          Recommended
        </h3>
        {submittedDocsSection ?? <VerificationPendingNote />}
        <ListingVerificationRollupSection orgId={orgId} orgSlug={orgSlug} modalOpen={modalOpen} />
      </section>
    );
  }

  return (
    <section aria-labelledby="verification-tier-recommended-panel-title" className="space-y-5">
      <div className="space-y-1">
        <h3
          id="verification-tier-recommended-panel-title"
          className="text-foreground text-sm font-semibold leading-tight"
        >
          Recommended
        </h3>
        <p className="text-muted-foreground text-xs leading-relaxed">{tier.benefit}</p>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="border-border border-b px-4 py-2.5 sm:px-4">
          <h4 className="text-foreground text-xs font-semibold">Perks &amp; benefits</h4>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)] sm:items-start sm:gap-4">
          <ul className="space-y-2">
            {VERIFICATION_BENEFIT_BULLETS.map((bullet) => (
              <li
                key={bullet}
                className="text-foreground flex items-start gap-2 text-xs leading-snug sm:text-sm"
              >
                <Check
                  className="text-primary mt-0.5 size-3.5 shrink-0"
                  strokeWidth={2.5}
                  aria-hidden
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <RecommendedBadgePreview hostName={orgName} />
        </div>
      </div>

      {enhancedStatus === 'rejected' ? (
        <VerificationFeedbackAlert
          kind={enhancedRejectionKind === 'changes' ? 'changes' : 'rejected'}
          title={enhancedRejectionKind === 'changes' ? 'What to update' : 'Rejection reason'}
          message={enhancedRejectionReason ?? 'Replace the documents below and submit again.'}
        />
      ) : null}

      {submittedDocsSection && enhancedStatus === 'rejected' ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
            Previously submitted
          </p>
          {submittedDocsSection}
        </div>
      ) : null}

      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="border-border border-b px-4 py-2.5 sm:px-4">
          <h4 className="text-foreground text-xs font-semibold">Docs required</h4>
        </div>
        <div className="space-y-4 p-4">
          <OnboardingProofUpload
            id="enhanced-facebook-page"
            label="Facebook Page screenshot"
            help={propertyAccessScreenshotHelp('facebook')}
            file={socialProof.file}
            previewUrl={socialProof.previewUrl}
            error={verifiedTouched && !slotReady(socialProof) ? 'Required' : null}
            onFileChange={onSocialProofChange}
          />
          <OnboardingProofUpload
            id="enhanced-selfie"
            label={VERIFICATION_TIER2_DOC_LABELS.selfie}
            help={VERIFICATION_TIER2_DOC_HELP.selfie}
            file={selfie.file}
            previewUrl={selfie.previewUrl}
            error={verifiedTouched && !slotReady(selfie) ? 'Required' : null}
            onFileChange={onSelfieChange}
          />
          <SocialPlatformSelect
            id="enhanced-platform-admin-platform"
            label="Platform"
            help="Choose the platform shown in your admin or host screenshot."
            value={platformAdminPlatform}
            onChange={onPlatformAdminPlatformChange}
            error={verifiedTouched && !platformAdminPlatform ? 'Select a platform' : null}
          />
          <OnboardingProofUpload
            id="enhanced-platform-admin"
            label={VERIFICATION_TIER2_DOC_LABELS.platformAdmin}
            help={VERIFICATION_TIER2_DOC_HELP.platformAdmin}
            file={platformAdmin.file}
            previewUrl={platformAdmin.previewUrl}
            error={verifiedTouched && !slotReady(platformAdmin) ? 'Required' : null}
            onFileChange={onPlatformAdminChange}
          />
          <OnboardingProofUpload
            id="enhanced-legitimacy-check"
            label={VERIFICATION_TIER2_DOC_LABELS.legitimacyCheck}
            help={VERIFICATION_TIER2_DOC_HELP.legitimacyCheck}
            file={legitimacyCheck.file}
            previewUrl={legitimacyCheck.previewUrl}
            onFileChange={onLegitimacyCheckChange}
          />
          <OnboardingProofUpload
            id="enhanced-business-permit"
            label={VERIFICATION_TIER2_DOC_LABELS.businessPermit}
            help={VERIFICATION_TIER2_DOC_HELP.businessPermit}
            file={businessPermit.file}
            previewUrl={businessPermit.previewUrl}
            onFileChange={onBusinessPermitChange}
          />
        </div>
      </div>

      <ListingVerificationRollupSection orgId={orgId} orgSlug={orgSlug} modalOpen={modalOpen} />
    </section>
  );
}

export function GetVerifiedModal({ open, onOpenChange, forced = false }: Props) {
  const queryClient = useQueryClient();
  const org = useCurrentOrganization();
  const { canUse: canSubmitRecommendedBadge, isLoading: recommendedEntitlementsLoading } =
    useFeatureGate('recommendedBadgeEligible');
  const { open: openUpgradeModal } = useUpgradeModal();
  const detail = readOrgVerificationDetail(org?.settings);
  const hostModes = resolveHostModes(org);
  const tiers = buildVerificationTiers(detail);
  const hostChecklist = buildHostTierChecklist(detail);
  const verifiedChecklist = buildVerifiedTierChecklist(detail);

  const hostRejected = detail.baseStatus === 'rejected';
  const hostChangesRequested = isHostVerificationChangesRequestedFromDetail(detail);
  const hostHardRejected = isHostVerificationHardRejectedFromDetail(detail);
  const blockDismiss = forced || hostChangesRequested;
  const fixValidId = hostChangesRequested;

  const showTier1SubmittedDocs = detail.baseStatus !== 'none';
  const showTier2SubmittedDocs = detail.enhancedStatus !== 'none';

  const handleOpenChange = (next: boolean) => {
    if (blockDismiss && !next) return;
    onOpenChange(next);
  };

  const [validId, setValidId] = useState<ProofSlot>(emptySlot);
  const [socialProof, setSocialProof] = useState<ProofSlot>(emptySlot);

  const [selfie, setSelfie] = useState<ProofSlot>(emptySlot);
  const [platformAdmin, setPlatformAdmin] = useState<ProofSlot>(emptySlot);
  const [platformAdminPlatform, setPlatformAdminPlatform] = useState<OrgSocialProofPlatform | ''>(
    ''
  );
  const [legitimacyCheck, setLegitimacyCheck] = useState<ProofSlot>(emptySlot);
  const [businessPermit, setBusinessPermit] = useState<ProofSlot>(emptySlot);
  const [submitting, setSubmitting] = useState<'base' | 'enhanced' | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [hostTouched, setHostTouched] = useState(false);
  const [verifiedTouched, setVerifiedTouched] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !org) return;
    const next = readOrgVerificationDetail(org.settings);
    const clearValidId = isHostVerificationChangesRequestedFromDetail(next);

    setValidId({
      file: null,
      previewUrl: null,
      path: clearValidId ? null : next.assets.validIdPath,
    });
    setSocialProof({
      file: null,
      previewUrl: null,
      path:
        clearValidId && next.baseChangesRequestedDocs.includes('socialProof')
          ? null
          : next.assets.socialProofPath,
    });
    setSelfie({ file: null, previewUrl: null, path: next.assets.selfieWithIdPath });
    setPlatformAdmin({
      file: null,
      previewUrl: null,
      path: next.assets.platformAdminProofPath,
    });
    setPlatformAdminPlatform(next.platformAdminPlatform ?? '');
    setLegitimacyCheck({
      file: null,
      previewUrl: null,
      path: next.assets.legitimacyCheckProofPath,
    });
    setBusinessPermit({
      file: null,
      previewUrl: null,
      path: next.assets.businessPermitOrBirPath,
    });
    setHostTouched(false);
    setVerifiedTouched(false);
    setUploadError(null);
    setActiveStep(defaultVerificationStepIndex(buildVerificationTiers(next)));
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
      validId: slotReady(validId),
      socialProof: slotReady(socialProof),
    },
    hostChangesRequested ? { changesRequestedDocs: detail.baseChangesRequestedDocs } : undefined
  );

  const canSubmitVerified = canSubmitVerifiedTier(detail, {
    socialProof: slotReady(socialProof),
    selfie: slotReady(selfie),
    platformAdmin: slotReady(platformAdmin),
    platformAdminPlatform,
  });

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
      if (socialProof.file) {
        const uploaded = await uploadVerificationAsset(org.id, 'social_proof', socialProof.file);
        setSocialProof({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }

      await callEdgeFunction('submit-org-verification', {
        method: 'POST',
        body: JSON.stringify({
          orgId: org.id,
          tier: 'base',
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
      toast.success('Verification resubmitted');
      onOpenChange(false);
    } catch (err) {
      if (isAiQuotaError(err)) {
        handleAiMutationError(err as Error);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubmitVerified = async () => {
    setVerifiedTouched(true);
    if (!org || !canSubmitVerified) return;
    if (!canSubmitRecommendedBadge) {
      if (!recommendedEntitlementsLoading) openUpgradeModal('recommendedBadgeEligible');
      return;
    }
    setSubmitting('enhanced');
    try {
      if (socialProof.file) {
        const uploaded = await uploadVerificationAsset(org.id, 'social_proof', socialProof.file);
        setSocialProof({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }
      if (selfie.file) {
        const uploaded = await uploadVerificationAsset(org.id, 'selfie_with_id', selfie.file);
        setSelfie({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }
      if (platformAdmin.file) {
        const uploaded = await uploadVerificationAsset(
          org.id,
          'platform_admin_proof',
          platformAdmin.file
        );
        setPlatformAdmin({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }
      if (legitimacyCheck.file) {
        const uploaded = await uploadVerificationAsset(
          org.id,
          'legitimacy_check_proof',
          legitimacyCheck.file
        );
        setLegitimacyCheck({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }
      if (businessPermit.file) {
        const uploaded = await uploadVerificationAsset(
          org.id,
          'business_permit_bir',
          businessPermit.file
        );
        setBusinessPermit({ file: null, previewUrl: uploaded.previewUrl, path: uploaded.path });
      }

      await callEdgeFunction('submit-org-verification', {
        method: 'POST',
        body: JSON.stringify({
          orgId: org.id,
          tier: 'enhanced',
          platformAdminPlatform,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
      toast.success('Recommended tier submitted');
      handleOpenChange(false);
    } catch (err) {
      if (isAiQuotaError(err)) {
        handleAiMutationError(err as Error);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
      <ResponsiveModalContent
        sheetLayout="split"
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
        <ResponsiveModalHeader
          className={cn(
            'border-border shrink-0 space-y-3 border-b px-5 pb-3.5 pt-5 text-left sm:px-6',
            blockDismiss && 'pr-5 sm:pr-6'
          )}
        >
          <ResponsiveModalTitle className="flex items-center gap-2.5 text-left text-lg font-semibold sm:text-lg">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full',
                hostChangesRequested
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {hostChangesRequested ? (
                <AlertCircle className="size-5" aria-hidden />
              ) : (
                <BadgeCheck className="size-5" aria-hidden />
              )}
            </span>
            {hostChangesRequested
              ? 'Changes requested'
              : activeStep === 1
                ? 'Get Recommended'
                : 'Get Verified'}
          </ResponsiveModalTitle>
          {!blockDismiss ? (
            <VerificationTierProgress
              tiers={tiers}
              activeStep={activeStep}
              onStepChange={setActiveStep}
              hostRejectionKind={detail.baseRejectionKind}
              verifiedRejectionKind={detail.enhancedRejectionKind}
            />
          ) : null}
        </ResponsiveModalHeader>

        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch] sm:px-6">
          <div className="pb-1">
            {hostChangesRequested || activeStep === 0 ? (
              <VerifiedTierStepPanel
                tier={hostTier}
                checklist={hostChecklist}
                pendingNote={detail.baseStatus === 'pending'}
                rejectionReason={hostRejected ? detail.baseRejectionReason : null}
                rejectionKind={hostRejected ? detail.baseRejectionKind : null}
                changesResubmit={hostChangesRequested}
                orgId={org?.id}
                orgSlug={org?.slug}
                modalOpen={open}
                showSubmittedDocs={showTier1SubmittedDocs}
              >
                {hostChangesRequested ? (
                  <div className="space-y-4">
                    {fixValidId ? (
                      <OnboardingHostVerificationSection
                        file={validId.file}
                        previewUrl={validId.previewUrl}
                        error={slotRequiredError(hostTouched, submitting !== null, validId)}
                        onFileChange={(file, preview) => {
                          setValidId({
                            file,
                            previewUrl: preview,
                            path: file ? null : validId.path,
                          });
                        }}
                        socialProofFile={socialProof.file}
                        socialProofPreviewUrl={socialProof.previewUrl}
                        socialProofError={slotRequiredError(
                          hostTouched,
                          submitting !== null,
                          socialProof
                        )}
                        onSocialProofChange={(file, preview) => {
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
                    ) : null}
                    {uploadError ? (
                      <p role="alert" className="text-destructive text-xs">
                        {uploadError}
                      </p>
                    ) : null}
                  </div>
                ) : hostHardRejected ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    This verification was declined. Start a new application to try again with
                    updated documents.
                  </p>
                ) : null}
              </VerifiedTierStepPanel>
            ) : (
              <RecommendedTierStepPanel
                tier={verifiedTier}
                orgName={org?.name}
                orgId={org?.id}
                orgSlug={org?.slug}
                modalOpen={open}
                checklist={verifiedChecklist}
                showSubmittedDocs={showTier2SubmittedDocs}
                verifiedApproved={verifiedApproved}
                verifiedPending={verifiedPending}
                enhancedStatus={detail.enhancedStatus}
                enhancedRejectionKind={detail.enhancedRejectionKind}
                enhancedRejectionReason={detail.enhancedRejectionReason}
                selfie={selfie}
                platformAdmin={platformAdmin}
                platformAdminPlatform={platformAdminPlatform}
                legitimacyCheck={legitimacyCheck}
                businessPermit={businessPermit}
                verifiedTouched={verifiedTouched}
                socialProof={socialProof}
                onSocialProofChange={setSlot(setSocialProof)}
                onSelfieChange={setSlot(setSelfie)}
                onPlatformAdminChange={setSlot(setPlatformAdmin)}
                onPlatformAdminPlatformChange={setPlatformAdminPlatform}
                onLegitimacyCheckChange={setSlot(setLegitimacyCheck)}
                onBusinessPermitChange={setSlot(setBusinessPermit)}
              />
            )}
          </div>
        </div>

        <ResponsiveModalFooter className="border-border shrink-0 gap-2 border-t px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
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
          {!hostChangesRequested && activeStep === 1 && verifiedEditable ? (
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
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

export function GetVerifiedSidebarCta({
  collapsed,
  variant = 'sidebar',
}: {
  collapsed?: boolean;
  variant?: 'sidebar' | 'icon';
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const org = useCurrentOrganization();
  const detail = readOrgVerificationDetail(org?.settings);
  const forced = isHostVerificationChangesRequestedFromDetail(detail);

  // Host/org verification lives on org routes only — listing shells use ListingVerificationSidebarCta.
  if (isPropertyAdminPath(location.pathname) || isParkingAdminPath(location.pathname)) {
    return null;
  }

  if (!org || !shouldShowGetVerifiedCta(detail)) return null;

  const label = verificationSidebarLabel(detail);

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={label}
          aria-label={label}
          className="border-primary/25 from-primary/[0.12] to-primary/[0.04] text-primary hover:from-primary/15 hover:to-primary/[0.08] flex size-10 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br shadow-sm transition-colors"
        >
          <BadgeCheck className="size-4 shrink-0" aria-hidden />
        </button>
        {!forced ? <GetVerifiedModal open={open} onOpenChange={setOpen} /> : null}
      </>
    );
  }

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
            'border-primary/25 from-primary/[0.12] to-primary/[0.04] text-primary hover:from-primary/15 hover:to-primary/[0.08] flex min-h-[44px] w-full items-center rounded-xl border bg-gradient-to-br shadow-sm transition-colors',
            collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2.5'
          )}
        >
          <span className="bg-primary/15 flex size-8 shrink-0 items-center justify-center rounded-full">
            <BadgeCheck className="size-4 shrink-0" aria-hidden />
          </span>
          {!collapsed ? (
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-semibold leading-tight">{label}</span>
              {detail.enhancedStatus === 'none' || detail.enhancedStatus === 'rejected' ? (
                <span className="text-primary/80 mt-0.5 block truncate text-[11px] font-medium leading-tight">
                  {VERIFICATION_SIDEBAR_SUBLABEL}
                </span>
              ) : null}
            </span>
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
