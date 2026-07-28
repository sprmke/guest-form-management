import { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, ChevronDown, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

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
  shouldShowGetVerifiedCta,
  validateVerificationFile,
  type OrgSocialProofPlatform,
} from '@/features/dashboard/org/lib/orgVerification';
import {
  buildHostTierChecklist,
  buildVerificationTiers,
  canSubmitVerifiedTier,
  readOrgVerificationDetail,
  resolveHostModes,
  verificationSidebarLabel,
  type VerificationTierDefinition,
} from '@/features/dashboard/org/lib/orgVerificationTiers';

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

function HostTierSummary({
  tier,
  checklist,
  pendingNote,
  rejectedNote,
}: {
  tier: VerificationTierDefinition;
  checklist: ReturnType<typeof buildHostTierChecklist>;
  pendingNote: boolean;
  rejectedNote: boolean;
}) {
  const [open, setOpen] = useState(tier.status === 'rejected');
  const doneCount = checklist.filter((item) => item.complete).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-border bg-muted/30 rounded-xl border">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted/50 flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
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
                <VerificationStatusBadge status={tier.status} />
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
                open && 'rotate-180'
              )}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-border space-y-3 border-t px-4 py-3">
            <VerificationChecklist items={checklist} compact />
            {pendingNote ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                Submitted during onboarding. Review usually takes a few hours up to 3 days.
              </p>
            ) : null}
            {rejectedNote ? (
              <p className="text-destructive text-xs leading-relaxed">
                Contact support to resubmit onboarding documents.
              </p>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function GetVerifiedModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const org = useCurrentOrganization();
  const detail = readOrgVerificationDetail(org?.settings);
  const hostModes = resolveHostModes(org);
  const tiers = buildVerificationTiers(detail);
  const hostChecklist = buildHostTierChecklist(detail, hostModes);

  const [selfie, setSelfie] = useState<ProofSlot>(emptySlot);
  const [ownership, setOwnership] = useState<ProofSlot>(emptySlot);
  const [pmo1, setPmo1] = useState<ProofSlot>(emptySlot);
  const [pmo2, setPmo2] = useState<ProofSlot>(emptySlot);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open || !org) return;
    const next = readOrgVerificationDetail(org.settings);
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
    setTouched(false);
  }, [open, org]);

  const hostTier = tiers[0]!;
  const verifiedTier = tiers[1]!;
  const verifiedApproved = verifiedTier.status === 'approved';
  const verifiedPending = verifiedTier.status === 'pending';
  const verifiedEditable = !verifiedApproved && !verifiedPending;

  const canSubmit = canSubmitVerifiedTier(detail, {
    selfie: slotReady(selfie),
    ownership: slotReady(ownership),
    pmo: slotReady(pmo1),
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

  const handleSubmitVerified = async () => {
    setTouched(true);
    if (!org || !canSubmit) return;
    setSubmitting(true);
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
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          // Override Dialog defaults: grid → flex, narrow sm:max-w, outer overflow-y-auto
          'flex h-[min(90dvh,40rem)] max-h-[min(90dvh,40rem)] w-[min(calc(100vw-1.5rem),40rem)] max-w-none flex-col gap-0 overflow-hidden p-0',
          'sm:h-[min(90dvh,42rem)] sm:max-h-[min(90dvh,42rem)] sm:w-[min(92vw,40rem)] sm:max-w-[40rem] sm:p-0'
        )}
      >
        <DialogHeader className="border-border shrink-0 space-y-4 border-b px-5 pb-4 pt-5 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2.5 text-left text-lg font-semibold sm:text-lg">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
              <BadgeCheck className="size-5" aria-hidden />
            </span>
            Get Verified
          </DialogTitle>
          <VerificationTierProgress tiers={tiers} />
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          <div className="space-y-4 pb-1">
            <HostTierSummary
              tier={hostTier}
              checklist={hostChecklist}
              pendingNote={detail.baseStatus === 'pending'}
              rejectedNote={detail.baseStatus === 'rejected'}
            />

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
                    <VerificationStatusBadge status={verifiedTier.status} />
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
                    <p className="text-destructive text-xs leading-relaxed">
                      Replace the documents below and submit again.
                    </p>
                  ) : null}
                  <OnboardingProofUpload
                    id="enhanced-selfie"
                    label="Selfie with valid ID"
                    help="Hold your valid ID next to your face in one photo so we can match you to the ID."
                    file={selfie.file}
                    previewUrl={selfie.previewUrl}
                    error={touched && !slotReady(selfie) ? 'Required' : null}
                    onFileChange={setSlot(setSelfie)}
                  />
                  <OnboardingProofUpload
                    id="enhanced-ownership"
                    label="Ownership or sublease proof"
                    help="Upload a unit ownership certificate, or an email from Azure acknowledging your sublease."
                    file={ownership.file}
                    previewUrl={ownership.previewUrl}
                    error={touched && !slotReady(ownership) ? 'Required' : null}
                    onFileChange={setSlot(setOwnership)}
                  />
                  <OnboardingProofUpload
                    id="enhanced-pmo-1"
                    label="Azure PMO email screenshot"
                    help="Screenshot of a past email thread with Azure PMO about your unit (dates and address visible)."
                    file={pmo1.file}
                    previewUrl={pmo1.previewUrl}
                    error={touched && !slotReady(pmo1) ? 'Required' : null}
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
          </div>
        </div>

        <DialogFooter className="border-border bg-background shrink-0 gap-2 border-t px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {verifiedEditable ? (
            <Button
              type="button"
              disabled={submitting || !canSubmit}
              onClick={() => void handleSubmitVerified()}
              className="min-h-[44px] min-w-[8.5rem]"
            >
              {submitting ? (
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
      <GetVerifiedModal open={open} onOpenChange={setOpen} />
    </>
  );
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
