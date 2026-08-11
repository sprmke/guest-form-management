/**
 * reconcile-document-approvals — admin-only re-apply of stored approved GAF/pet PDFs
 * when a sub-step was marked incomplete. Replaces the reconcile half of gmail-listener.
 */

import { reconcileManualIncompleteApprovals } from '../_shared/approvalDocumentReconcile.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { jsonResponse, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('reconcile-document-approvals', async (req) => {
  requireHttpMethod(req, ['POST']);
  const { property } = await resolveScopedPropertyAccess(req, 'bookings:workflow');
  const reconciled = await reconcileManualIncompleteApprovals(property.id);
  const total = reconciled.gaf + reconciled.pet;
  return jsonResponse(req, {
    success: true,
    reconciled: total,
    reconciledGaf: reconciled.gaf,
    reconciledPet: reconciled.pet,
    applied: 0,
    skipped: 0,
    failed: 0,
  });
});
