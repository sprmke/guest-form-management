/**
 * Re-apply GAF/pet nested completion when admins marked a sub-step incomplete but the
 * row still has an `approved_*_pdf_url` from a prior inbound apply. Same message will
 * not re-arrive, so this pass refreshes from DB + orchestrator.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { APPROVAL_INTAKE_DEV_CONTROLS } from './approvalEmailMatcher.ts';
import { WorkflowOrchestrator } from './workflowOrchestrator.ts';

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

export async function reconcileManualIncompleteApprovals(
  propertyId: string
): Promise<{ gaf: number; pet: number }> {
  const sb = supabaseAdmin();
  let gaf = 0;
  let pet = 0;

  const { data: gafRows, error: gafErr } = await sb
    .from('guest_submissions')
    .select('id, approved_gaf_pdf_url')
    .eq('property_id', propertyId)
    .eq('status', 'PENDING_DOCUMENTS')
    .eq('gaf_manual_incomplete', true)
    .not('approved_gaf_pdf_url', 'is', null);

  if (gafErr) {
    console.error('[approvalDocumentReconcile] GAF query failed:', gafErr.message);
  } else {
    for (const row of gafRows ?? []) {
      try {
        await WorkflowOrchestrator.transition(
          row.id as string,
          'PENDING_DOCUMENTS',
          {
            approved_gaf_pdf_url: row.approved_gaf_pdf_url,
            document_completion_target: 'PENDING_GAF',
          },
          { ...APPROVAL_INTAKE_DEV_CONTROLS },
          false
        );
        gaf += 1;
        console.log(
          `[approvalDocumentReconcile] Reconciled GAF for booking ${row.id} (manual incomplete + existing PDF URL)`
        );
      } catch (e) {
        console.error(
          `[approvalDocumentReconcile] Reconcile GAF failed for ${row.id}:`,
          (e as Error).message
        );
      }
    }
  }

  const { data: petRows, error: petErr } = await sb
    .from('guest_submissions')
    .select('id, approved_pet_pdf_url')
    .eq('property_id', propertyId)
    .eq('status', 'PENDING_DOCUMENTS')
    .eq('pet_manual_incomplete', true)
    .not('approved_pet_pdf_url', 'is', null);

  if (petErr) {
    console.error('[approvalDocumentReconcile] pet query failed:', petErr.message);
  } else {
    for (const row of petRows ?? []) {
      try {
        await WorkflowOrchestrator.transition(
          row.id as string,
          'PENDING_DOCUMENTS',
          {
            approved_pet_pdf_url: row.approved_pet_pdf_url,
            document_completion_target: 'PENDING_PET_REQUEST',
          },
          { ...APPROVAL_INTAKE_DEV_CONTROLS },
          false
        );
        pet += 1;
        console.log(
          `[approvalDocumentReconcile] Reconciled pet for booking ${row.id} (manual incomplete + existing PDF URL)`
        );
      } catch (e) {
        console.error(
          `[approvalDocumentReconcile] Reconcile pet failed for ${row.id}:`,
          (e as Error).message
        );
      }
    }
  }

  return { gaf, pet };
}
