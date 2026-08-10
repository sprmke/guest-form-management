/**
 * Stage-specific sub-form switch — ported from the pre-decomposition
 * `WorkflowPanel.tsx`. Selects which sub-form / info card to render based on
 * `workflowContentForView()` (`viewedContent`), computed upstream by
 * `useWorkflowActions`.
 */

import { Info, Loader2, RefreshCw } from 'lucide-react';

import { GuestBalanceSettlementForm } from '@/features/dashboard/bookings/components/GuestBalanceSettlementForm';
import type { GuestBalanceSettlementValues } from '@/features/dashboard/bookings/components/GuestBalanceSettlementForm';
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
import type { DocumentRequirement } from '@/features/dashboard/bookings/lib/documentRequirements';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import type {
  PendingDocNestedKey,
  WorkflowViewContent,
} from '@/features/dashboard/bookings/lib/workflow';
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

  // SD guest-info card (READY_FOR_CHECKOUT)
  sdGuestFormUrl: string;
  onCopySdGuestFormUrl: () => void;
  recheckSdGuestSubmitPending: boolean;
  onRecheckGuestSdSubmission: () => void;
};

export function WorkflowSubFormHost({
  isModal,
  booking,
  viewedContent,
  contentReadOnly,
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
  sdGuestFormUrl,
  onCopySdGuestFormUrl,
  recheckSdGuestSubmitPending,
  onRecheckGuestSdSubmission,
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

  return (
    <div
      className={cn(
        isModal
          ? 'min-h-0 flex-1 space-y-3 overflow-y-auto py-3'
          : 'border-separator space-y-6 border-b px-4 py-4'
      )}
    >
      {contentReadOnly && !isModal && !showCompletedSummary ? (
        <div
          role="status"
          className="border-primary/25 bg-primary/5 dark:border-primary/30 dark:bg-primary/10 flex gap-2.5 rounded-xl border px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
        >
          <Info
            className="text-primary dark:text-primary mt-0.5 size-4 shrink-0 sm:size-[18px]"
            aria-hidden
          />
          <p className="text-foreground dark:text-foreground min-w-0 text-[12px] leading-snug sm:text-[13px]">
            Completed steps are read-only here. Edit them in{' '}
            <span className="font-semibold">Edit Booking Details</span>.
          </p>
        </div>
      ) : null}
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
      {showCompletedSummary && <WorkflowCompletedSummaryCard booking={booking} plain={isModal} />}
      {needsDocSubStatus && (
        <PendingDocSubStatusCard
          booking={booking}
          sub={activePendingDocSubStatus}
          requirements={documentRequirements}
          plain={isModal}
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
          variant={formVariant}
        />
      )}
      {needsGuestBalance && (
        <GuestBalanceSettlementForm
          booking={booking}
          initialDraft={guestBalanceValues}
          onChange={onGuestBalanceChange}
          readOnly={contentReadOnly}
          variant={formVariant}
        />
      )}
      {needsSdRefund && (
        <SdRefundForm
          booking={booking}
          initialDraft={sdRefundValues}
          onChange={onSdRefundChange}
          readOnly={contentReadOnly}
          variant={formVariant}
        />
      )}
    </div>
  );
}
