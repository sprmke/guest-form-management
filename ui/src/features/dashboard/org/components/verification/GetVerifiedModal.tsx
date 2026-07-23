import { useState } from 'react';

import { useParams } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { OnboardingProofUpload } from '@/features/dashboard/org/components/onboarding/OnboardingProofUpload';
import { OnboardingTrustNotice } from '@/features/dashboard/org/components/onboarding/OnboardingTrustNotice';
import { VerificationFieldLabel } from '@/features/dashboard/org/components/onboarding/VerificationFieldLabel';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import {
  ORGANIZATIONS_QUERY_KEY,
  useOrganizations,
} from '@/features/dashboard/org/hooks/useOrganizations';
import { callEdgeFunction, getSessionJwt } from '@/features/dashboard/org/lib/edgeClient';
import {
  ORG_SOCIAL_PROOF_PLATFORMS,
  readOrgVerificationSummary,
  shouldShowGetVerifiedCta,
  type OrgSocialProofPlatform,
  validateVerificationFile,
} from '@/features/dashboard/org/lib/orgVerification';

import { Button } from '@/components/ui/button';
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

export function GetVerifiedModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const org = useCurrentOrganization();
  const summary = readOrgVerificationSummary(org?.settings);

  const [selfie, setSelfie] = useState<ProofSlot>(emptySlot);
  const [ownership, setOwnership] = useState<ProofSlot>(emptySlot);
  const [pmo1, setPmo1] = useState<ProofSlot>(emptySlot);
  const [pmo2, setPmo2] = useState<ProofSlot>(emptySlot);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const pending = summary.enhancedStatus === 'pending';
  const approved = summary.enhancedStatus === 'approved';

  const selfieOk = Boolean(selfie.file || selfie.path);
  const ownershipOk = Boolean(ownership.file || ownership.path);
  const pmoOk = Boolean(pmo1.file || pmo1.path);
  const canSubmit = selfieOk && ownershipOk && pmoOk && !pending && !approved;

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

  const handleSubmit = async () => {
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
      toast.success('Verification submitted');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,40rem)] max-w-[min(calc(100vw-1.5rem),28rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="text-primary size-5" aria-hidden />
            Get Verified
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <OnboardingTrustNotice />

          {approved ? (
            <p className="text-foreground text-sm font-medium">
              Your host page shows a Verified badge.
            </p>
          ) : pending ? (
            <p className="text-muted-foreground text-sm">
              Enhanced verification is under review. This can take a few hours up to 3 days.
            </p>
          ) : (
            <>
              <OnboardingProofUpload
                id="enhanced-selfie"
                label="Selfie with valid ID"
                help="Hold your valid ID next to your face in one photo so we can match you to the ID."
                file={selfie.file}
                previewUrl={selfie.previewUrl}
                error={touched && !selfieOk ? 'Required' : null}
                onFileChange={setSlot(setSelfie)}
              />
              <OnboardingProofUpload
                id="enhanced-ownership"
                label="Ownership or sublease proof"
                help="Upload a unit ownership certificate, or an email from Azure acknowledging your sublease."
                file={ownership.file}
                previewUrl={ownership.previewUrl}
                error={touched && !ownershipOk ? 'Required' : null}
                onFileChange={setSlot(setOwnership)}
              />
              <OnboardingProofUpload
                id="enhanced-pmo-1"
                label="Azure PMO email screenshot"
                help="Screenshot of a past email thread with Azure PMO about your unit (dates and address visible)."
                file={pmo1.file}
                previewUrl={pmo1.previewUrl}
                error={touched && !pmoOk ? 'Required' : null}
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
            </>
          )}
        </div>

        {!approved && !pending ? (
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || !canSubmit}
              onClick={() => void handleSubmit()}
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
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function GetVerifiedSidebarCta({ collapsed }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const org = useCurrentOrganization();
  const summary = readOrgVerificationSummary(org?.settings);

  if (!org || !shouldShowGetVerifiedCta(summary)) return null;

  const label =
    summary.enhancedStatus === 'pending'
      ? 'Verification pending'
      : summary.enhancedStatus === 'rejected'
        ? 'Resubmit verification'
        : 'Get Verified';

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
            'border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 flex min-h-[44px] w-full items-center rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
            collapsed ? 'justify-center' : 'gap-2.5'
          )}
        >
          <Shield className="size-4 shrink-0" aria-hidden />
          {!collapsed ? <span className="truncate">{label}</span> : null}
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
