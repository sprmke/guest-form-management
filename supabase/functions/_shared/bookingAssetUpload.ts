/**
 * Shared booking-document upload — used by `upload-booking-asset` and the AI assistant
 * `propose_apply_booking_attachment` confirm path. Keeps AI validation, guest-doc revert,
 * and storage keys identical across callers.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { syncPricingReviewBalanceReceipt } from './bookingAiReviewService.ts';
import { bookingAssetStorageKey } from './bookingStoragePaths.ts';
import { DatabaseService } from './databaseService.ts';
import { resolveOrgIdForProperty } from './aiUsageService.ts';
import {
  applyReceiptSanityChecks,
  dbPatchForDocumentAiValidation,
  documentAiKindForAssetType,
  type ReceiptValidationResult,
  shouldPersistReceiptValidation,
  validateReceiptFile,
  validateValidIdFile,
  type AiUsageContext,
} from './receiptValidationService.ts';
import {
  pendingDocumentsClearCompletionsJsonbPatch,
  pendingDocumentsClearPatchForGuestEditRevert,
  shouldRevertGuestFieldEditsToPendingReview,
} from './statusMachine.ts';
import { notifyTelegramAdminBalanceReceiptUploaded } from './telegramAdmin.ts';
import { assertWithinUploadLimit, type UploadLimitKind } from './uploadLimits.ts';
import { formatPublicUrl } from './utils.ts';

export const BOOKING_ASSET_CONFIG = {
  parking_endorsement: {
    bucket: 'parking-endorsements',
    column: 'parking_endorsement_url',
  },
  parking_payment_receipt: {
    bucket: 'payment-receipts',
    column: 'parking_payment_receipt_url',
  },
  approved_gaf: {
    bucket: 'approved-gafs',
    column: 'approved_gaf_pdf_url',
  },
  approved_pet: {
    bucket: 'approved-pet-forms',
    column: 'approved_pet_pdf_url',
  },
  sd_refund_receipt: {
    bucket: 'sd-refund-receipts',
    column: 'sd_refund_receipt_url',
  },
  guest_balance_payment_receipt: {
    bucket: 'sd-refund-receipts',
    column: 'guest_balance_payment_receipt_url',
  },
  valid_id: {
    bucket: 'valid-ids',
    column: 'valid_id_url',
  },
  guest2_valid_id: {
    bucket: 'valid-ids',
    column: 'guest2_valid_id_url',
  },
  guest3_valid_id: {
    bucket: 'valid-ids',
    column: 'guest3_valid_id_url',
  },
  guest4_valid_id: {
    bucket: 'valid-ids',
    column: 'guest4_valid_id_url',
  },
  guest5_valid_id: {
    bucket: 'valid-ids',
    column: 'guest5_valid_id_url',
  },
  payment_receipt: {
    bucket: 'payment-receipts',
    column: 'payment_receipt_url',
  },
  pet_vaccination: {
    bucket: 'pet-vaccinations',
    column: 'pet_vaccination_url',
  },
  pet_image: {
    bucket: 'pet-images',
    column: 'pet_image_url',
  },
} as const;

export type BookingAssetType = keyof typeof BOOKING_ASSET_CONFIG;

export const BOOKING_ASSET_TYPES = Object.keys(BOOKING_ASSET_CONFIG) as BookingAssetType[];

export const BOOKING_ASSET_LABELS: Record<BookingAssetType, string> = {
  parking_endorsement: 'Parking endorsement',
  parking_payment_receipt: 'Parking payment receipt',
  approved_gaf: 'Approved GAF',
  approved_pet: 'Approved pet form',
  sd_refund_receipt: 'SD refund receipt',
  guest_balance_payment_receipt: 'Guest balance payment receipt',
  valid_id: 'Valid ID',
  guest2_valid_id: 'Guest 2 valid ID',
  guest3_valid_id: 'Guest 3 valid ID',
  guest4_valid_id: 'Guest 4 valid ID',
  guest5_valid_id: 'Guest 5 valid ID',
  payment_receipt: 'Downpayment receipt',
  pet_vaccination: 'Pet vaccination',
  pet_image: 'Pet photo',
};

const PDF_ONLY = new Set(['application/pdf']);
const IMAGE_OR_PDF = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const IMAGE_ONLY = new Set(['image/jpeg', 'image/png', 'image/webp']);

const ASSET_MIME: Record<BookingAssetType, Set<string>> = {
  parking_endorsement: IMAGE_OR_PDF,
  parking_payment_receipt: IMAGE_OR_PDF,
  approved_gaf: PDF_ONLY,
  approved_pet: PDF_ONLY,
  sd_refund_receipt: IMAGE_OR_PDF,
  guest_balance_payment_receipt: IMAGE_OR_PDF,
  valid_id: IMAGE_OR_PDF,
  guest2_valid_id: IMAGE_OR_PDF,
  guest3_valid_id: IMAGE_OR_PDF,
  guest4_valid_id: IMAGE_OR_PDF,
  guest5_valid_id: IMAGE_OR_PDF,
  payment_receipt: IMAGE_OR_PDF,
  pet_vaccination: IMAGE_OR_PDF,
  pet_image: IMAGE_ONLY,
};

export function isBookingAssetType(value: unknown): value is BookingAssetType {
  return typeof value === 'string' && value in BOOKING_ASSET_CONFIG;
}

export function bookingAssetPermission(
  assetType: BookingAssetType
):
  | 'bookings.detail.workflow:edit'
  | 'bookings.detail.guests:edit'
  | 'bookings.detail.pets:edit'
  | 'bookings.detail.pricing:edit'
  | 'bookings.detail.stay:edit' {
  if (
    assetType === 'parking_endorsement' ||
    assetType === 'parking_payment_receipt' ||
    assetType === 'approved_gaf' ||
    assetType === 'approved_pet' ||
    assetType === 'sd_refund_receipt' ||
    assetType === 'guest_balance_payment_receipt'
  ) {
    return 'bookings.detail.workflow:edit';
  }
  if (
    assetType === 'valid_id' ||
    assetType === 'guest2_valid_id' ||
    assetType === 'guest3_valid_id' ||
    assetType === 'guest4_valid_id' ||
    assetType === 'guest5_valid_id'
  ) {
    return 'bookings.detail.guests:edit';
  }
  if (assetType === 'pet_vaccination' || assetType === 'pet_image') {
    return 'bookings.detail.pets:edit';
  }
  if (assetType === 'payment_receipt') {
    return 'bookings.detail.pricing:edit';
  }
  return 'bookings.detail.stay:edit';
}

function isGuestDocRevertAssetType(t: BookingAssetType): boolean {
  return (
    t === 'payment_receipt' ||
    t === 'valid_id' ||
    t === 'guest2_valid_id' ||
    t === 'guest3_valid_id' ||
    t === 'guest4_valid_id' ||
    t === 'guest5_valid_id' ||
    t === 'pet_vaccination' ||
    t === 'pet_image'
  );
}

function uploadLimitKind(assetType: BookingAssetType, mimeType: string): UploadLimitKind {
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    assetType === 'valid_id' ||
    assetType === 'guest2_valid_id' ||
    assetType === 'guest3_valid_id' ||
    assetType === 'guest4_valid_id' ||
    assetType === 'guest5_valid_id' ||
    assetType === 'payment_receipt' ||
    assetType === 'parking_payment_receipt' ||
    assetType === 'guest_balance_payment_receipt' ||
    assetType === 'sd_refund_receipt' ||
    assetType === 'pet_vaccination'
  ) {
    return 'document';
  }
  return 'image';
}

export function assertBookingAssetMime(assetType: BookingAssetType, mimeType: string): void {
  const allowed = ASSET_MIME[assetType];
  const normalized = mimeType.trim().toLowerCase();
  if (!allowed.has(normalized)) {
    const expect = [...allowed].join(', ');
    throw new Error(`Unsupported file type for ${BOOKING_ASSET_LABELS[assetType]}: use ${expect}`);
  }
}

export type ApplyBookingAssetInput = {
  bookingId: string;
  propertyId: string;
  assetType: BookingAssetType;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  actorUserId: string;
  logPrefix?: string;
};

export type ApplyBookingAssetResult = {
  url: string;
  bucket: string;
  path: string;
  column: string;
  previousUrl: string | null;
  revertedToPendingReview: boolean;
  receiptValidation: ReceiptValidationResult | null;
};

export async function applyBookingAssetFromBytes(
  input: ApplyBookingAssetInput
): Promise<ApplyBookingAssetResult> {
  const logPrefix = input.logPrefix ?? '[bookingAssetUpload]';
  const mimeType = input.mimeType.trim().toLowerCase();
  assertBookingAssetMime(input.assetType, mimeType);
  assertWithinUploadLimit(
    { size: input.bytes.byteLength },
    uploadLimitKind(input.assetType, mimeType)
  );

  const config = BOOKING_ASSET_CONFIG[input.assetType];
  const storagePath = bookingAssetStorageKey(input.propertyId, input.bookingId, input.fileName);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { error: uploadError } = await supabase.storage
    .from(config.bucket)
    .upload(storagePath, input.bytes, { contentType: mimeType, upsert: true });
  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(config.bucket).getPublicUrl(storagePath);
  const safePublicUrl = formatPublicUrl(publicUrl);

  const booking = await DatabaseService.getBookingById(input.bookingId);
  if (!booking) {
    throw new Error(`Booking not found: ${input.bookingId}`);
  }

  const previousRaw = (booking as Record<string, unknown>)[config.column];
  const previousUrl =
    typeof previousRaw === 'string' && previousRaw.trim() ? previousRaw.trim() : null;

  const workflowUpdate: Record<string, unknown> = {
    [config.column]: safePublicUrl,
  };

  if (input.assetType === 'pet_vaccination' || input.assetType === 'pet_image') {
    workflowUpdate.has_pets = true;
  }

  let receiptValidation: ReceiptValidationResult | undefined;
  const docAiKind = documentAiKindForAssetType(input.assetType);
  if (docAiKind) {
    try {
      const orgId = await resolveOrgIdForProperty(input.propertyId);
      const aiUsage: AiUsageContext | null = orgId
        ? { organizationId: orgId, propertyId: input.propertyId, actorUserId: input.actorUserId }
        : null;
      const file = new File([input.bytes], input.fileName, { type: mimeType });
      receiptValidation =
        docAiKind === 'valid_id'
          ? await validateValidIdFile(file, aiUsage)
          : await validateReceiptFile(file, aiUsage);
      receiptValidation = applyReceiptSanityChecks(
        docAiKind,
        booking as Record<string, unknown>,
        receiptValidation
      );
      if (shouldPersistReceiptValidation(receiptValidation)) {
        Object.assign(workflowUpdate, dbPatchForDocumentAiValidation(docAiKind, receiptValidation));
      }
      console.log(
        `${logPrefix} ${input.assetType} AI: ${receiptValidation.verdict} — ${receiptValidation.summary}`
      );
    } catch (aiErr) {
      console.error(`${logPrefix} Receipt AI validation failed (non-fatal):`, aiErr);
    }
  }

  let revertedToPendingReview = false;
  if (
    shouldRevertGuestFieldEditsToPendingReview(booking.status) &&
    isGuestDocRevertAssetType(input.assetType)
  ) {
    Object.assign(workflowUpdate, pendingDocumentsClearPatchForGuestEditRevert());
    workflowUpdate.document_requirement_completions = pendingDocumentsClearCompletionsJsonbPatch(
      booking.document_requirement_completions
    );
    workflowUpdate.status = 'PENDING_REVIEW';
    workflowUpdate.status_updated_at = new Date().toISOString();
    revertedToPendingReview = true;
    console.log(
      `${logPrefix} ${input.assetType} replaced while ${booking.status} → PENDING_REVIEW`
    );
  }

  await DatabaseService.setWorkflowFields(input.bookingId, workflowUpdate);

  if (input.assetType === 'guest_balance_payment_receipt') {
    try {
      await syncPricingReviewBalanceReceipt(input.bookingId);
    } catch (aiReviewErr) {
      console.error(`${logPrefix} AI Summary Pricing sync failed (non-fatal):`, aiReviewErr);
    }
    try {
      const refreshed = await DatabaseService.getBookingById(input.bookingId);
      if (refreshed) {
        await notifyTelegramAdminBalanceReceiptUploaded(refreshed as Record<string, unknown>);
      }
    } catch (tgErr) {
      console.error(`${logPrefix} Telegram balance receipt notify failed (non-fatal):`, tgErr);
    }
  }

  console.log(`${logPrefix} Uploaded ${input.assetType} for ${input.bookingId}: ${safePublicUrl}`);

  return {
    url: safePublicUrl,
    bucket: config.bucket,
    path: storagePath,
    column: config.column,
    previousUrl,
    revertedToPendingReview,
    receiptValidation: receiptValidation ?? null,
  };
}

/** Requirement id / legacy target for mark-complete after applying approved GAF/pet. */
export function documentCompletionTargetForAsset(
  assetType: BookingAssetType
): 'gaf' | 'pet' | null {
  if (assetType === 'approved_gaf') return 'gaf';
  if (assetType === 'approved_pet') return 'pet';
  return null;
}
