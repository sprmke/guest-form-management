import { useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

import { listingAuthorizationAssetsQueryKey } from '@/features/dashboard/org/hooks/useListingAuthorization';
import { ORGANIZATIONS_QUERY_KEY } from '@/features/dashboard/org/hooks/useOrganizations';
import {
  hasActiveConsiderationGrant,
  isInGracePeriod,
  isListingAccessLocked,
  type ContractLegLifecycle,
} from '@/features/dashboard/org/lib/contractLifecycle';
import { callEdgeFunction, getSessionJwt } from '@/features/dashboard/org/lib/edgeClient';
import type { ListingKind } from '@/features/dashboard/org/lib/listingAuthorization';
import {
  todayManilaYmd,
  validateVerificationFile,
  VERIFICATION_ACCEPT,
} from '@/features/dashboard/org/lib/orgVerification';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

function canSubmitClient(
  lifecycle: ContractLegLifecycle,
  contractEndYmd: string | null,
  todayYmd: string
): boolean {
  if (!contractEndYmd) return false;
  if (!isInGracePeriod(contractEndYmd, todayYmd)) return false;
  if (isListingAccessLocked(lifecycle) && !lifecycle.consideration.allowConsiderationOverride) {
    return false;
  }
  if (lifecycle.consideration.selfServeUsedThisCycle) return false;
  if (lifecycle.consideration.status === 'pending') return false;
  if (hasActiveConsiderationGrant(lifecycle, todayYmd)) return false;
  return true;
}

async function uploadConsiderationProof(
  orgId: string,
  listingKind: ListingKind,
  file: File
): Promise<string> {
  const jwt = await getSessionJwt();
  const body = new FormData();
  body.append('orgId', orgId);
  body.append(
    'assetType',
    listingKind === 'parking' ? 'parking_consideration_proof' : 'property_consideration_proof'
  );
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
    data?: { path: string };
  };
  if (!res.ok || !json.success || !json.data?.path) {
    throw new Error(json.error ?? 'Upload failed');
  }
  return json.data.path;
}

type Props = {
  listingKind: ListingKind;
  listingId: string;
  orgId: string;
  contractEndYmd: string | null;
  lifecycle: ContractLegLifecycle;
  isOwner: boolean;
  children: React.ReactNode;
  /** Opens listing verification modal for renewal. */
  onRenewVerification?: () => void;
};

/**
 * Listing-scoped lock after T+5 (or grant expiry).
 * Grace period still renders children with a thin banner (owner can act later).
 */
export function RequireListingContractAccess({
  listingKind,
  listingId,
  orgId,
  contractEndYmd,
  lifecycle,
  isOwner,
  children,
  onRenewVerification,
}: Props) {
  const today = todayManilaYmd();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const granted = hasActiveConsiderationGrant(lifecycle, today);
  const locked = isListingAccessLocked(lifecycle) && !granted;
  const inGrace =
    Boolean(contractEndYmd) && isInGracePeriod(contractEndYmd!, today) && !locked && !granted;
  const canSubmit = isOwner && canSubmitClient(lifecycle, contractEndYmd, today);

  const [note, setNote] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPath, setProofPath] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      let path = proofPath.trim();
      if (proofFile) {
        path = await uploadConsiderationProof(orgId, listingKind, proofFile);
      }
      if (!path) throw new Error('Proof is required');
      await callEdgeFunction('submit-contract-consideration', {
        method: 'POST',
        body: JSON.stringify({
          listingKind,
          listingId,
          note,
          expectedDate,
          proofPaths: [path],
        }),
      });
    },
    onSuccess: async () => {
      toast.success('Consideration submitted');
      setNote('');
      setExpectedDate('');
      setProofFile(null);
      setProofPath('');
      if (fileRef.current) fileRef.current.value = '';
      await qc.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
      await qc.invalidateQueries({
        queryKey: listingAuthorizationAssetsQueryKey(listingKind, listingId),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (locked) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <Lock className="text-muted-foreground size-8" aria-hidden />
        <p className="text-foreground text-base font-semibold">
          {listingKind === 'parking' ? 'Parking' : 'Property'} access locked
        </p>
        {isOwner ? (
          <>
            <p className="text-muted-foreground text-sm">
              Renew listing verification for Super Admin review.
            </p>
            {onRenewVerification ? (
              <Button type="button" className="min-h-[44px]" onClick={onRenewVerification}>
                Renew verification
              </Button>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Contact the organization owner.</p>
        )}
      </div>
    );
  }

  return (
    <>
      {inGrace || granted ? (
        <div
          className="border-border space-y-3 border-b bg-amber-500/10 px-3 py-3 text-amber-950 sm:px-4 dark:text-amber-100"
          role="status"
        >
          <p className="text-sm">
            {granted
              ? `Temporary access until ${lifecycle.consideration.grantedUntil}`
              : 'Contract ended — renew or request consideration before access locks.'}
          </p>
          {canSubmit ? (
            <div className="flex max-w-xl flex-col gap-2">
              <Textarea
                aria-label="Consideration note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note"
                className="bg-background min-h-[72px]"
              />
              <Input
                type="date"
                aria-label="Requested access until"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="bg-background h-10"
              />
              <Input
                ref={fileRef}
                type="file"
                accept={VERIFICATION_ACCEPT}
                aria-label="Consideration proof"
                className="bg-background h-10 py-1.5"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (!file) {
                    setProofFile(null);
                    return;
                  }
                  const err = validateVerificationFile(file);
                  if (err) {
                    toast.error(err);
                    e.target.value = '';
                    setProofFile(null);
                    return;
                  }
                  setProofFile(file);
                  setProofPath('');
                }}
              />
              <div className="flex flex-wrap gap-2">
                {onRenewVerification ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] w-full sm:w-auto"
                    onClick={onRenewVerification}
                  >
                    Renew verification
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="min-h-[44px] w-full sm:w-auto"
                  disabled={submitMutation.isPending || !note.trim() || !expectedDate || !proofFile}
                  onClick={() => submitMutation.mutate()}
                >
                  Request consideration
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </>
  );
}
