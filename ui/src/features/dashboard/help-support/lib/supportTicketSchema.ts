import { z } from 'zod';

export const SUPPORT_TICKET_CATEGORIES = [
  'bug_report',
  'feature_suggestion',
  'general_inquiry',
  'business_inquiry',
] as const;
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];

export const SUPPORT_TICKET_SEVERITIES = ['low', 'medium', 'high'] as const;
export type SupportTicketSeverity = (typeof SUPPORT_TICKET_SEVERITIES)[number];

export type SupportTicketAttachmentDraft = {
  name: string;
  mimeType: string;
  size: number;
  path: string;
};

const attachmentsSchema = z
  .array(
    z.object({
      name: z.string(),
      mimeType: z.string(),
      size: z.number(),
      path: z.string(),
    })
  )
  .max(3, 'Attach up to 3 files')
  .default([]);

export const supportTicketFormSchema = z.discriminatedUnion('category', [
  z.object({
    category: z.literal('bug_report'),
    subject: z.string().trim().min(1, 'Subject is required').max(200),
    description: z.string().trim().min(1, 'Description is required').max(5000),
    pageUrl: z.string().trim().max(500).optional(),
    browserInfo: z.string().trim().max(500).optional(),
    severity: z.enum(SUPPORT_TICKET_SEVERITIES),
    attachments: attachmentsSchema,
  }),
  z.object({
    category: z.literal('feature_suggestion'),
    subject: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().min(1, 'Description is required').max(5000),
    expectedBenefit: z.string().trim().max(1000).optional(),
  }),
  z.object({
    category: z.literal('general_inquiry'),
    subject: z.string().trim().min(1, 'Subject is required').max(200),
    description: z.string().trim().min(1, 'Message is required').max(5000),
  }),
  z.object({
    category: z.literal('business_inquiry'),
    subject: z.string().trim().min(1, 'Subject is required').max(200),
    description: z.string().trim().min(1, 'Message is required').max(5000),
    contactPreference: z.string().trim().max(200).optional(),
  }),
]);

export type SupportTicketFormValues = z.infer<typeof supportTicketFormSchema>;

export const SUPPORT_TICKET_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  bug_report: 'Bug report',
  feature_suggestion: 'Feature suggestion',
  general_inquiry: 'General inquiry',
  business_inquiry: 'Business inquiry',
};

export const SUPPORT_TICKET_CATEGORY_DESCRIPTIONS: Record<SupportTicketCategory, string> = {
  bug_report: 'Something is broken or not working as expected',
  feature_suggestion: 'An idea to improve the platform',
  general_inquiry: 'A question about how something works',
  business_inquiry: 'Partnerships, billing, or other business matters',
};
