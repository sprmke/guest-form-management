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

  const [orgVerifications, externalReviews] = await Promise.all([
    listOrgVerificationApprovalRows(),
    listExternalReviewApprovalRows(),
  ]);

  return jsonSuccess(req, {
    approvals: [...orgVerifications, ...externalReviews],
    orgVerifications,
    externalReviews,
  });
});
