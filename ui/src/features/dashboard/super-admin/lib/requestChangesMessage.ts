import { ORG_SOCIAL_PROOF_PLATFORMS } from '@/features/dashboard/org/lib/orgVerification';
import type { OrgVerificationChangeDocId } from '@/features/dashboard/org/lib/orgVerificationTiers';
import type { OrgApprovalDetail } from '@/features/dashboard/super-admin/types/approval';

export type ChangeDocId = OrgVerificationChangeDocId;

export type ChangeDocOption = {
  id: ChangeDocId;
  label: string;
  url: string | null;
};

/** Preset reasons for Super Admin “Request changes” (document / submission quality). */
export const HOST_REQUEST_CHANGES_REASON_OPTIONS = [
  {
    id: 'unclear_documents',
    label: 'Documents are unclear, incomplete, or unreadable',
  },
  {
    id: 'id_unverified',
    label: 'Valid ID could not be verified',
  },
  {
    id: 'ownership_insufficient',
    label: 'Ownership or authorization proof is insufficient',
  },
  {
    id: 'listing_access_invalid',
    label: 'Listing or platform access could not be verified',
  },
  {
    id: 'details_mismatch',
    label: 'Submitted details do not match the documents provided',
  },
] as const;

export type HostRequestChangesReasonId = (typeof HOST_REQUEST_CHANGES_REASON_OPTIONS)[number]['id'];

export function hostRequestChangesReasonLabel(id: HostRequestChangesReasonId): string {
  return HOST_REQUEST_CHANGES_REASON_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

function platformLabel(value: string | null): string | null {
  if (!value) return null;
  return ORG_SOCIAL_PROOF_PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

export function buildChangeDocOptions(
  detail: OrgApprovalDetail,
  hostModes: string[]
): ChangeDocOption[] {
  const needsProperty = hostModes.includes('property');
  const needsParking = hostModes.includes('parking');
  const platform = platformLabel(detail.verification.socialPlatform);
  const options: ChangeDocOption[] = [
    { id: 'validId', label: 'Valid ID', url: detail.assetUrls.validIdUrl },
  ];
  if (needsProperty) {
    options.push({
      id: 'socialProof',
      label: platform ? `${platform} access` : 'Listing access',
      url: detail.assetUrls.socialProofUrl,
    });
    options.push({
      id: 'propertyOwnership',
      label: 'Ownership / management',
      url: detail.assetUrls.propertyOwnershipProofUrl,
    });
  }
  if (needsParking) {
    options.push({
      id: 'parkingProof',
      label: 'Parking ownership / management',
      url: detail.assetUrls.parkingSocialProofUrl,
    });
  }
  return options;
}

/** Compose the host-facing message from preset reasons + selected docs + optional notes. */
export function buildRequestChangesMessage(
  reasonIds: readonly HostRequestChangesReasonId[],
  selectedLabels: string[],
  notes: string
): string | null {
  if (reasonIds.length === 0) return null;
  const reasonLabels = HOST_REQUEST_CHANGES_REASON_OPTIONS.filter((option) =>
    reasonIds.includes(option.id)
  ).map((option) => option.label);
  const parts: string[] = [];
  if (reasonLabels.length === 1) {
    parts.push(reasonLabels[0]!);
  } else if (reasonLabels.length > 1) {
    parts.push(reasonLabels.map((label) => `• ${label}`).join('\n'));
  }
  if (selectedLabels.length > 0) {
    parts.push(`Please re-upload: ${selectedLabels.join(', ')}.`);
  }
  const trimmedNotes = notes.trim();
  if (trimmedNotes) parts.push(trimmedNotes);
  return parts.join('\n\n').trim() || null;
}

/**
 * Resolve which docs the host must re-upload.
 * Prefers structured `baseChangesRequestedDocs`; falls back to parsing the reason text.
 * Empty = show all applicable fields (legacy requests with no doc list).
 */
export function resolveHostChangesRequestedDocs(input: {
  stored: OrgVerificationChangeDocId[];
  reason: string | null;
  hostModes: string[];
}): OrgVerificationChangeDocId[] {
  if (input.stored.length > 0) return input.stored;

  const reason = input.reason ?? '';
  const match = reason.match(/Please re-upload:\s*([^\n.]+)/i);
  if (!match?.[1]) return [];

  const modes = input.hostModes.length > 0 ? input.hostModes : ['property'];
  const needsProperty = modes.includes('property');
  const needsParking = modes.includes('parking');
  const tokens = match[1]
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const out: OrgVerificationChangeDocId[] = [];
  const add = (id: OrgVerificationChangeDocId) => {
    if (!out.includes(id)) out.push(id);
  };

  for (const token of tokens) {
    if (token === 'valid id' || token.startsWith('valid id')) {
      add('validId');
      continue;
    }
    if (needsParking && token.includes('parking')) {
      add('parkingProof');
      continue;
    }
    if (needsProperty && (token === 'ownership / management' || token.includes('ownership'))) {
      add('propertyOwnership');
      continue;
    }
    if (
      needsProperty &&
      (token.includes('access') || token.includes('listing') || token.endsWith(' access'))
    ) {
      add('socialProof');
    }
  }

  return out;
}
