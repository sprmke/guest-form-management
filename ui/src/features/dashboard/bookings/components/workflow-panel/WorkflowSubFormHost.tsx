/**
 * Stage-specific sub-form switch — ported from the pre-decomposition
 * `WorkflowPanel.tsx`. Selects which sub-form / info card to render based on
 * `workflowContentForView()` (`viewedContent`), computed upstream by
 * `useWorkflowActions`.
 */

import { Loader2, RefreshCw } from 'lucide-react';

import { GuestBalanceSettlementForm } from '@/features/dashboard/bookings/components/GuestBalanceSettlementForm';
import type { GuestBalanceSettlementValues } from '@/features/dashboard/bookings/components/GuestBalanceSettlementForm';
import {
  GuestSdRefundEditForm,
  type GuestSdRefundEditValues,
} from '@/features/dashboard/bookings/components/GuestSdRefundEditForm';
import { InlineCopyIconButton } from '@/features/dashboard/bookings/components/InlineCopyIconButton';
import { ParkingRequestForm } from '@/features/dashboard/bookings/components/ParkingRequestForm';
import type { ParkingRequestValues } from '@/features/dashboard/bookings/components/ParkingRequestForm';
import { ReviewPricingForm } from '@/features/dashboard/bookings/components/ReviewPricingForm';
import type { ReviewPricingFormValues } from '@/features/dashboard/bookings/components/ReviewPricingForm';
import { SdRefundForm } from '@/features/dashboard/bookings/components/SdRefundForm';
import type { SdRefundValues } from '@/features/dashboard/bookings/components/SdRefundForm';
import { SurpriseDecorAckCard } from '@/features/dashboard/bookings/components/SurpriseDecorAckCard';
import { WorkflowCompletedSummaryCard } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowCompletedSummaryCard';
import { PendingDocSubStatusCard } from '@/features/dashboard/bookings/components/workflow-panel/WorkflowPendingDocStatusCard';
import { WorkflowSubFormCard } from '@/features/dashboard/bookings/components/WorkflowSubFormCard';
import type { BookingAssetPreviewHandler } from '@/features/dashboard/bookings/hooks/useBookingAssetPreview';
import type { DocumentRequirement } from '@/features/dashboard/bookings/lib/documentRequirements';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import type {
  PendingDocNestedKey,
  WorkflowViewContent,
} from '@/features/dashboard/bookings/lib/workflow';
import { isProgressEditFormEnabled } from '@/features/dashboard/bookings/lib/workflow';
import {
  workflowInlineLink,
  workflowNeutralActionClass,
} from '@/features/dashboard/bookings/lib/workflowActionButtonStyles';
import type { PricingHolidayRuleDto } from '@/features/dashboard/pricing/lib/phHolidayRules';
import type { PropertyPricingDefaults } from '@/features/dashboard/pricing/lib/pricingCompute';

import { cn } from '@/lib/utils';

type Props = {
  isModal: boolean;
  booking: BookingRow;
  viewedContent: WorkflowViewContent | null;
  contentReadOnly: boolean;
  /** When true, drafts emit even if incomplete (rail Save without Proceed). */
  persistPartialDrafts: boolean;
  activePendingDocSubStatus: PendingDocNestedKey;
  documentRequirements: DocumentRequirement[];

  // Pricing sub-form
  pricingValues: ReviewPricingFormValues | null;
  onPricingChange: (values: ReviewPricingFormValues | null) => void;
  propertyPricingLoaded: boolean;
  propertyPricingDefaults: PropertyPricingDefaults;
  propertyPricingDateOverrides?: Record<string, number>;
  propertyPricingHolidayRules?: PricingHolidayRuleDto[];
  surpriseDecorStaffAck: boolean;
  onSurpriseDecorStaffAckChange: (value: boolean) => void;

  // Parking sub-form
  parkingValues: ParkingRequestValues | null;
  onParkingChange: (values: ParkingRequestValues | null) => void;

  // Guest balance sub-form
  guestBalanceValues: GuestBalanceSettlementValues | null;
  onGuestBalanceChange: (values: GuestBalanceSettlementValues | null) => void;

  // SD refund sub-form
  sdRefundValues: SdRefundValues | null;
  onSdRefundChange: (values: SdRefundValues | null) => void;
  onSdRefundGuestChange: (values: GuestSdRefundEditValues | null) => void;

  // SD guest-info card (READY_FOR_CHECKOUT)
  sdGuestFormUrl: string;
  onCopySdGuestFormUrl: () => void;
  recheckSdGuestSubmitPending: boolean;
  onRecheckGuestSdSubmission: () => void;
  onPreview: BookingAssetPreviewHandler;
};

export function WorkflowSubFormHost({
  isModal,
  booking,
  viewedContent,
  contentReadOnly,
  persistPartialDrafts,
  activePendingDocSubStatus,
  documentRequirements,
  pricingValues,
  onPricingChange,
  propertyPricingLoaded,
  propertyPricingDefaults,
  propertyPricingDateOverrides,
  propertyPricingHolidayRules,
  surpriseDecorStaffAck,
  onSurpriseDecorStaffAckChange,
  parkingValues,
  onParkingChange,
  guestBalanceValues,
  onGuestBalanceChange,
  sdRefundValues,
  onSdRefundChange,
  onSdRefundGuestChange,
  sdGuestFormUrl,
  onCopySdGuestFormUrl,
  recheckSdGuestSubmitPending,
  onRecheckGuestSdSubmission,
  onPreview,
}: Props) {
  const needsPricing = viewedContent === 'pricing';
  const needsParking = viewedContent === 'parking';
  const needsSdRefund = viewedContent === 'sd_refund';
  const needsGuestBalance = viewedContent === 'guest_balance';
  const needsDocSubStatus = viewedContent === 'doc_sub_status';
  const showSdGuestInfoCard = viewedContent === 'sd_guest_info';
  const showCompletedSummary = viewedContent === 'completed_summary';
  const showStageContent =
    needsPricing ||
    needsParking ||
    needsSdRefund ||
    needsGuestBalance ||
    needsDocSubStatus ||
    showSdGuestInfoCard ||
    showCompletedSummary;

  if (!showStageContent) return null;

  const formVariant = isModal ? 'modal' : 'workflow';
  const editMode = persistPartialDrafts && !contentReadOnly;
  const showGuestSdEdit =
    needsSdRefund && !contentReadOnly && isProgressEditFormEnabled(booking, 'sd_refund_guest');

  return (
    <div
      className={cn(
        isModal
          ? 'min-h-0 flex-1 space-y-3 overflow-y-auto py-3'
          : 'border-separator space-y-6 border-b px-4 py-4'
      )}
    >
      {showSdGuestInfoCard && (
        <WorkflowSubFormCard title="Guest SD refund form" plain={isModal}>
          <p className="text-muted-foreground text-[11.5px] leading-relaxed">
            Waiting for the guest SD refund form. Submitting moves this booking to{' '}
            <span className="text-foreground font-medium">Pending SD Refund</span>.
          </p>
          <div>
            <span className="inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-1">
              <a
                href={sdGuestFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={workflowInlineLink}
              >
                SD Refund Link
              </a>
              <InlineCopyIconButton
                aria-label="Copy SD refund form link to clipboard"
                onClick={onCopySdGuestFormUrl}
              />
            </span>
          </div>
          <button
            type="button"
            disabled={recheckSdGuestSubmitPending}
            onClick={onRecheckGuestSdSubmission}
            className={cn(workflowNeutralActionClass(), 'justify-center gap-2')}
          >
            {recheckSdGuestSubmitPending ? (
              <Loader2
                className="text-muted-foreground size-3.5 shrink-0 animate-spin"
                aria-hidden
              />
            ) : (
              <RefreshCw className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
            )}
            Check for guest submission
          </button>
        </WorkflowSubFormCard>
      )}
      {showCompletedSummary && (
        <WorkflowCompletedSummaryCard booking={booking} plain={isModal} onPreview={onPreview} />
      )}
      {needsDocSubStatus && (
        <PendingDocSubStatusCard
          booking={booking}
          sub={activePendingDocSubStatus}
          requirements={documentRequirements}
          plain={isModal}
          onPreview={onPreview}
        />
      )}
      {needsPricing && (
        <>
          <ReviewPricingForm
            key={`${booking.id}-pricing-sd-${booking.guest_requests_surprise_decor ? 1 : 0}-${propertyPricingLoaded ? 'loaded' : 'pending'}`}
            booking={booking}
            initialDraft={pricingValues}
            onChange={onPricingChange}
            readOnly={contentReadOnly}
            editMode={editMode}
            propertyDefaults={propertyPricingDefaults}
            dateOverrides={propertyPricingDateOverrides}
            holidayRules={propertyPricingHolidayRules}
            variant={formVariant}
          />
          {booking.guest_requests_surprise_decor ? (
            <SurpriseDecorAckCard
              acknowledged={surpriseDecorStaffAck}
              onAcknowledgedChange={onSurpriseDecorStaffAckChange}
              readOnly={contentReadOnly}
              plain={isModal}
            />
          ) : null}
        </>
      )}
      {needsParking && (
        <ParkingRequestForm
          booking={booking}
          initialDraft={parkingValues}
          onChange={onParkingChange}
          readOnly={contentReadOnly}
          editMode={editMode}
          variant={formVariant}
          onPreview={onPreview}
        />
      )}
      {needsGuestBalance && (
        <GuestBalanceSettlementForm
          booking={booking}
          initialDraft={guestBalanceValues}
          onChange={onGuestBalanceChange}
          readOnly={contentReadOnly}
          editMode={editMode}
          variant={formVariant}
          onPreview={onPreview}
        />
      )}
      {needsSdRefund && (
        <>
          {showGuestSdEdit ? (
            <GuestSdRefundEditForm
              key={`${booking.id}-sd-guest`}
              booking={booking}
              onChange={onSdRefundGuestChange}
              editMode={editMode}
              variant={formVariant === 'modal' ? 'modal' : 'workflow'}
            />
          ) : null}
          <SdRefundForm
            booking={booking}
            initialDraft={sdRefundValues}
            onChange={onSdRefundChange}
            readOnly={contentReadOnly}
            editMode={editMode}
            variant={formVariant}
            showGuestDetails={!showGuestSdEdit}
            onPreview={onPreview}
          />
        </>
      )}
    </div>
  );
}
