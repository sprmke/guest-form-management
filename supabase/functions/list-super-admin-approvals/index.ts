/**
 * list-super-admin-approvals — GET unified super-admin queue (org verifications + external reviews).
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  externalReviewImageStoragePath,
  normalizeExternalReviewsDraft,
  type ExternalReviewModerationStatus,
  type ExternalReviewSource,
} from '../_shared/propertyExternalReviews.ts';
import { listListingVerificationApprovalRows } from '../_shared/superAdminListingVerifications.ts';
import { listOrgVerificationApprovalRows } from '../_shared/superAdminOrgVerifications.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { verifySuperAdminJwt } from '../_shared/superAdminAuth.ts';

export type ExternalReviewApprovalRow = {
  type: 'external_review';
  propertyId: string;
  propertyName: string;
  propertySlug: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  reviewId: string;
  source: ExternalReviewSource;
  reviewText: string;
  reviewerName: string;
  starRating: number | null;
  moderationStatus: ExternalReviewModerationStatus;
  submittedAt: string | null;
  imageUrl: string | null;
  proofUrl: string | null;
  stayPhotoUrls: string[];
  imagePath: string | null;
};

export type ApprovalRow =
  | Awaited<ReturnType<typeof listOrgVerificationApprovalRows>>[number]
  | Awaited<ReturnType<typeof listListingVerificationApprovalRows>>[number]
  | ExternalReviewApprovalRow;

type ApprovalStatusFilter = 'all' | 'pending' | 'approved' | 'changes' | 'rejected';
type ApprovalTypeFilter = 'all' | 'property' | 'parking' | 'listing_verification' | 'reviews';

function matchesTypeFilter(row: ApprovalRow, type: ApprovalTypeFilter): boolean {
  if (type === 'all') return true;
  if (type === 'reviews') return row.type === 'external_review';
  if (type === 'listing_verification') return row.type === 'listing_verification';
  if (row.type !== 'org_verification') return false;
  if (type === 'property') return row.hostModes.includes('property');
  if (type === 'parking') return row.hostModes.includes('parking');
  return true;
}

function matchesStatusFilter(row: ApprovalRow, status: ApprovalStatusFilter): boolean {
  if (status === 'all') return true;

  if (row.type === 'external_review') {
    if (status === 'changes') return false;
    return row.moderationStatus === status;
  }

  if (row.type === 'listing_verification') {
    const queuePending = row.baseStatus === 'pending' || row.recommendedStatus === 'pending';
    if (status === 'changes') {
      const baseChanges = row.baseStatus === 'rejected' && row.baseRejectionKind === 'changes';
      const recommendedChanges =
        row.recommendedStatus === 'rejected' && row.recommendedRejectionKind === 'changes';
      return baseChanges || recommendedChanges;
    }
    if (status === 'rejected') {
      const baseHard = row.baseStatus === 'rejected' && row.baseRejectionKind !== 'changes';
      const recommendedHard =
        row.recommendedStatus === 'rejected' && row.recommendedRejectionKind !== 'changes';
      return baseHard || recommendedHard;
    }
    if (status === 'pending') return queuePending;
    return row.baseStatus === status || row.recommendedStatus === status;
  }

  const queuePending = row.baseStatus === 'pending' || row.enhancedStatus === 'pending';
  if (status === 'changes') {
    return row.baseStatus === 'rejected' && row.baseRejectionKind === 'changes';
  }
  if (status === 'rejected') {
    const baseHard = row.baseStatus === 'rejected' && row.baseRejectionKind !== 'changes';
    const enhancedHard = row.enhancedStatus === 'rejected';
    return baseHard || enhancedHard;
  }
  if (status === 'pending') return queuePending;
  return row.baseStatus === status || row.enhancedStatus === status;
}

function matchesSearch(row: ApprovalRow, search: string): boolean {
  if (!search) return true;

  if (row.type === 'external_review') {
    return [row.propertyName, row.organizationName, row.reviewText, row.reviewerName, row.source]
      .join(' ')
      .toLowerCase()
      .includes(search);
  }

  if (row.type === 'listing_verification') {
    return [row.listingName, row.organizationName, row.ownerName, row.ownerEmail, row.listingKind]
      .join(' ')
      .toLowerCase()
      .includes(search);
  }

  return [row.organizationName, row.ownerName, row.ownerEmail]
    .join(' ')
    .toLowerCase()
    .includes(search);
}

async function listExternalReviewApprovalRows(): Promise<ExternalReviewApprovalRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select(
      'property_id, external_reviews, properties!inner(id, name, slug, organization_id, organizations!inner(id, name, slug))'
    );

  if (error) {
    console.error('[list-super-admin-approvals] app_settings:', error.message);
    throw new Error('Failed to load external reviews');
  }

  const rows: ExternalReviewApprovalRow[] = [];

  for (const row of data ?? []) {
    const property = row.properties as {
      id: string;
      name: string;
      slug: string;
      organization_id: string;
      organizations: { id: string; name: string; slug: string };
    } | null;
    if (!property?.organizations) continue;

    const propertyId = row.property_id as string;
    const reviews = normalizeExternalReviewsDraft(row.external_reviews);
    for (const review of reviews) {
      rows.push({
        type: 'external_review',
        propertyId,
        propertyName: property.name,
        propertySlug: property.slug,
        organizationId: property.organizations.id,
        organizationName: property.organizations.name,
        organizationSlug: property.organizations.slug,
        reviewId: review.id,
        source: review.source,
        reviewText: review.reviewText,
        reviewerName: review.reviewerName,
        starRating: review.starRating,
        moderationStatus: review.moderationStatus,
        submittedAt: review.createdAt,
        imageUrl: review.imageUrl,
        proofUrl: review.proofUrl,
        stayPhotoUrls: review.stayPhotoUrls,
        imagePath: externalReviewImageStoragePath(review.imageUrl, propertyId, review.id),
      });
    }
  }

  rows.sort((a, b) => {
    const aPending = a.moderationStatus === 'pending' ? 1 : 0;
    const bPending = b.moderationStatus === 'pending' ? 1 : 0;
    if (bPending !== aPending) return bPending - aPending;
    return (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '');
  });

  return rows;
}

serveAuthenticated('list-super-admin-approvals', async (req) => {
  requireHttpMethod(req, 'GET');
  await verifySuperAdminJwt(req);

  const url = new URL(req.url);
  const p = url.searchParams;
  const page = Math.max(1, parseInt(p.get('page') ?? '1', 10));
  const limit = Math.min(500, Math.max(1, parseInt(p.get('limit') ?? '31', 10)));
  const type = (p.get('type') ?? 'all') as ApprovalTypeFilter;
  const status = (p.get('status') ?? 'all') as ApprovalStatusFilter;
  const search = (p.get('search') ?? '').trim().toLowerCase();

  // Type narrows which of the three heterogeneous sources are even worth fetching —
  // e.g. type=reviews skips the org + listing queries entirely. host_modes is pushed
  // down to the org query via .contains(). Status/search still can't be expressed as a
  // single filtered query per source: statuses are derived from nested settings JSONB
  // (listing verification also falls back to the org's settings when the listing has no
  // block of its own — see resolveListingAuthorization), and search spans fields that
  // aren't columns on these tables (owner name/email come from the Auth Admin API, review
  // text lives inside an `external_reviews` JSONB array). Those two stay in-memory, applied
  // to the now much smaller, type-narrowed row set before the final sort + pagination slice.
  // A real fix would be a dedicated SQL view/RPC exposing precomputed status columns — see
  // docs/guides/routes/admin/approvals.md for the scale caveat.
  const needsOrg = type === 'all' || type === 'property' || type === 'parking';
  const needsListing = type === 'all' || type === 'listing_verification';
  const needsReviews = type === 'all' || type === 'reviews';
  const orgHostMode = type === 'property' || type === 'parking' ? type : undefined;

  const [orgVerifications, listingVerifications, externalReviews] = await Promise.all([
    needsOrg ? listOrgVerificationApprovalRows({ hostMode: orgHostMode }) : Promise.resolve([]),
    needsListing ? listListingVerificationApprovalRows() : Promise.resolve([]),
    needsReviews ? listExternalReviewApprovalRows() : Promise.resolve([]),
  ]);

  const merged: ApprovalRow[] = [...orgVerifications, ...listingVerifications, ...externalReviews];
  const filtered = merged.filter(
    (row) =>
      matchesTypeFilter(row, type) && matchesStatusFilter(row, status) && matchesSearch(row, search)
  );

  const total = filtered.length;
  const fromIdx = (page - 1) * limit;
  const paged = filtered.slice(fromIdx, fromIdx + limit);

  return jsonSuccess(req, {
    approvals: paged,
    total,
    page,
    limit,
  });
});
