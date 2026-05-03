import { z } from 'zod';

export const SD_BANKS = ['GCash', 'Maribank', 'BDO', 'BPI'] as const;
export type SdBank = (typeof SD_BANKS)[number];

export const refundBodySchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('same_phone'),
  }),
  z.object({
    method: z.literal('other_bank'),
    bank: z.enum(SD_BANKS, { required_error: 'Choose a bank' }),
    accountName: z.string().trim().min(1, 'Account name is required'),
    accountNumber: z.string().trim().min(1, 'Account number is required'),
  }),
  z.object({
    method: z.literal('cash'),
  }),
]);

export type RefundBodyValues = z.infer<typeof refundBodySchema>;

export const sdFormSubmitSchema = z.object({
  refund: refundBodySchema,
});

export type SdFormSubmitValues = z.infer<typeof sdFormSubmitSchema>;
