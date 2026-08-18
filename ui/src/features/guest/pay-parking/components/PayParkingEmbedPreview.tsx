import { Car } from 'lucide-react';

import {
  DEFAULT_GUEST_PAYMENT_INFO,
  useGuestPaymentInfo,
} from '@/features/guest/form/hooks/useGuestPaymentInfo';
import { pickGuestBrandHeaderProps } from '@/features/guest/form/lib/guestFormBranding';

import { GuestFormBrandHeader } from '@/components/branding/GuestFormBrandHeader';
import { Label } from '@/components/ui/label';

const PAY_PARKING_BRAND_TITLE = 'Pay Parking Form';

/** Dashboard Public Pages iframe — pay parking guest form. */
export function PayParkingEmbedPreview() {
  const { data: guestBrand = DEFAULT_GUEST_PAYMENT_INFO } = useGuestPaymentInfo();
  const brandHeader = pickGuestBrandHeaderProps(guestBrand);

  return (
    <div className="relative space-y-6 p-4 sm:p-6 lg:p-8">
      <GuestFormBrandHeader {...brandHeader} title={PAY_PARKING_BRAND_TITLE} />

      <section className="form-section !px-4 !py-5 sm:!px-5 sm:!py-6">
        <div className="form-section-header">
          <Car className="form-section-icon" aria-hidden />
          <h2 className="form-section-title !text-base sm:!text-lg">Vehicle details</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plate number</Label>
            <div className="bg-muted h-10 w-full rounded-md" aria-hidden />
          </div>
          <div className="space-y-2">
            <Label>Brand & model</Label>
            <div className="bg-muted h-10 w-full rounded-md" aria-hidden />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="bg-muted h-10 w-full rounded-md" aria-hidden />
          </div>
        </div>
      </section>
    </div>
  );
}
