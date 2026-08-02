/**
 * Client mirror of `supabase/functions/_shared/documentRequirements.ts` types +
 * default list + applicability check. No async resolve here — the UI receives
 * the resolved per-property list from the booking/settings payload (Task 5–6).
 *
 * ⚠️  Keep in sync with the server file when either changes.
 */

export type DocumentApprovalSource = 'manual' | 'email-listener' | 'none';
export type DocumentTriggerCondition = 'always' | 'has_pets' | 'need_parking';

export type DocumentRequirement = {
  id: string;
  label: string;
  order: number;
  pdfTemplateId: string | null;
  approvalSource: DocumentApprovalSource;
  triggerCondition: DocumentTriggerCondition;
  calendarIcon: string | null;
};

export type DocumentRequirementCompletion = {
  completedAt: string | null;
  approvedPdfUrl: string | null;
  manualIncomplete: boolean;
};

export const DEFAULT_DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  {
    id: 'gaf',
    label: 'GAF Request',
    order: 1,
    pdfTemplateId: 'gaf',
    approvalSource: 'email-listener',
    triggerCondition: 'always',
    calendarIcon: null,
  },
  {
    id: 'pet',
    label: 'Pet Approval',
    order: 2,
    pdfTemplateId: 'pet',
    approvalSource: 'email-listener',
    triggerCondition: 'has_pets',
    calendarIcon: '🐶',
  },
];

function flagTrue(value: unknown): boolean {
  return value === true || value === 'true';
}

export function requirementApplies(
  req: DocumentRequirement,
  booking: { has_pets?: unknown; need_parking?: unknown }
): boolean {
  switch (req.triggerCondition) {
    case 'always':
      return true;
    case 'has_pets':
      return flagTrue(booking.has_pets);
    case 'need_parking':
      return flagTrue(booking.need_parking);
    default:
      return false;
  }
}
