import type {
  DocumentApprovalSource,
  DocumentRequirement,
  DocumentTriggerCondition,
} from '@/features/dashboard/bookings/lib/documentRequirements';

export const DOCUMENT_TRIGGER_CONDITIONS: DocumentTriggerCondition[] = [
  'always',
  'has_pets',
  'need_parking',
];

export const DOCUMENT_APPROVAL_SOURCES: DocumentApprovalSource[] = [
  'manual',
  'email-listener',
  'none',
];

export const DOCUMENT_TRIGGER_CONDITION_LABELS: Record<DocumentTriggerCondition, string> = {
  always: 'Always required',
  has_pets: 'Guest has pets',
  need_parking: 'Guest needs parking',
};

export const DOCUMENT_APPROVAL_SOURCE_LABELS: Record<DocumentApprovalSource, string> = {
  manual: 'Manual — admin marks complete',
  'email-listener': 'Email listener — auto-approve',
  none: 'No approval needed',
};

export function documentRequirementsOverrideEqual(
  a: DocumentRequirement[] | null,
  b: DocumentRequirement[] | null
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function withNormalizedOrder(list: DocumentRequirement[]): DocumentRequirement[] {
  return list.map((req, index) => ({ ...req, order: index + 1 }));
}

function nextRequirementId(existing: DocumentRequirement[]): string {
  const usedIds = new Set(existing.map((req) => req.id));
  let n = existing.length + 1;
  while (usedIds.has(`custom-${n}`)) n += 1;
  return `custom-${n}`;
}

export function createDocumentRequirement(existing: DocumentRequirement[]): DocumentRequirement {
  return {
    id: nextRequirementId(existing),
    label: '',
    order: existing.length + 1,
    pdfTemplateId: null,
    approvalSource: 'manual',
    triggerCondition: 'always',
    calendarIcon: null,
  };
}

export function addDocumentRequirement(list: DocumentRequirement[]): DocumentRequirement[] {
  return withNormalizedOrder([...list, createDocumentRequirement(list)]);
}

export function removeDocumentRequirement(
  list: DocumentRequirement[],
  index: number
): DocumentRequirement[] {
  return withNormalizedOrder(list.filter((_, i) => i !== index));
}

export function moveDocumentRequirement(
  list: DocumentRequirement[],
  index: number,
  direction: -1 | 1
): DocumentRequirement[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const moved = next[index]!;
  next[index] = next[target]!;
  next[target] = moved;
  return withNormalizedOrder(next);
}

export function updateDocumentRequirement(
  list: DocumentRequirement[],
  index: number,
  patch: Partial<DocumentRequirement>
): DocumentRequirement[] {
  return list.map((req, i) => (i === index ? { ...req, ...patch } : req));
}
