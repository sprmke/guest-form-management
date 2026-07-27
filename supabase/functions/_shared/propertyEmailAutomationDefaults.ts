/**
 * Per-residence email automation labels, placeholders, and defaults.
 * Keep in sync with ui/src/features/dashboard/org/lib/propertyEmailAutomationDefaults.ts
 */

import { DEFAULT_RESIDENCE_NAME } from './propertyResidenceDefaults.ts';

export const AZURE_PMO_EMAIL = 'stlmonaco.theresortresidences@azurenorth.com.ph';

export type EmailAutomationFieldCopy = {
  pmoEmailLabel: string;
  pmoEmailHint: string;
  pmoEmailPlaceholder: string;
  propertyEmailLabel: string;
  propertyEmailHint: string;
  propertyEmailPlaceholder: string;
  defaultPmoEmail: string;
};

const GENERIC_COPY: EmailAutomationFieldCopy = {
  pmoEmailLabel: 'Documents approver email',
  pmoEmailHint: 'Receives GAF and pet approval requests.',
  pmoEmailPlaceholder: 'documents@yourcompany.com',
  propertyEmailLabel: 'Team email',
  propertyEmailHint:
    'New booking alerts and guest reply-to. Gmail accepts GAF/pet approvals from this sender.',
  propertyEmailPlaceholder: 'team@yourcompany.com',
  defaultPmoEmail: '',
};

const AZURE_NORTH_COPY: EmailAutomationFieldCopy = {
  pmoEmailLabel: 'PMO email',
  pmoEmailHint: 'Email for GAF and pet request approvals.',
  pmoEmailPlaceholder: AZURE_PMO_EMAIL,
  propertyEmailLabel: 'Property email',
  propertyEmailHint:
    'PMO-approved property email for sending and receiving document requests and approvals.',
  propertyEmailPlaceholder: 'property@azurenorth.com.ph',
  defaultPmoEmail: AZURE_PMO_EMAIL,
};

const COPY_BY_RESIDENCE: Record<string, EmailAutomationFieldCopy> = {
  [DEFAULT_RESIDENCE_NAME]: AZURE_NORTH_COPY,
};

export function getEmailAutomationDefaults(residenceName: string): EmailAutomationFieldCopy {
  const normalized = residenceName.trim();
  return COPY_BY_RESIDENCE[normalized] ?? GENERIC_COPY;
}
