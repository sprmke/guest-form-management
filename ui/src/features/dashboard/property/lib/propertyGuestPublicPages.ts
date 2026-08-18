import { BookOpen, Calendar, Car, FileText, Home, MessageCircle, Star, Wallet } from 'lucide-react';

import {
  guestCalendarPath,
  guestFormPath,
  guestMessagesPreviewPath,
  guestPayParkingPreviewPath,
  guestPayParkingPathPrefix,
  guestPropertyPath,
  guestReviewShellPath,
  guestSdFormShellPath,
  guestStayGuidePreviewPath,
} from '@/features/guest/lib/guestPublicPaths';

import type { LucideIcon } from 'lucide-react';

export type PropertyGuestPublicPage = {
  id:
    | 'listing'
    | 'calendar'
    | 'form'
    | 'messages'
    | 'stay-guide'
    | 'sd-form'
    | 'guest-review'
    | 'pay-parking';
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  /** Copy uses a different URL than open (e.g. booking-scoped pages). */
  copyPath?: string;
  /** Open in new tab uses `?embed=1` so hosts see a preview instead of a missing-booking error. */
  openUsesEmbed?: boolean;
};

/** Guest-facing property URLs hosts can open from the dashboard. */
export function buildPropertyGuestPublicPages(
  propertySlug: string,
  propertyId: string
): PropertyGuestPublicPage[] {
  return [
    {
      id: 'listing',
      label: 'Property',
      description: 'Photos, rates, amenities, and reserve actions on your listing.',
      path: guestPropertyPath(propertySlug),
      icon: Home,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      description: 'Guests pick check-in and check-out before the booking form.',
      path: guestCalendarPath(propertySlug),
      icon: Calendar,
    },
    {
      id: 'form',
      label: 'Form',
      description: 'Multi-step booking request guests submit after choosing dates.',
      path: guestFormPath(propertySlug),
      icon: FileText,
    },
    {
      id: 'messages',
      label: 'Messages',
      description: 'Pre-stay chat between guests and your team.',
      path: guestMessagesPreviewPath(propertySlug),
      icon: MessageCircle,
    },
    {
      id: 'stay-guide',
      label: 'Stay Guide',
      description: 'House rules and check-in info sent at ready-for-checkin.',
      path: guestStayGuidePreviewPath(propertySlug, propertyId),
      icon: BookOpen,
    },
    {
      id: 'sd-form',
      label: 'SD Refund',
      description: 'Review, voucher, and refund details after checkout.',
      path: guestSdFormShellPath(propertySlug),
      icon: Wallet,
      openUsesEmbed: true,
    },
    {
      id: 'guest-review',
      label: 'Guest Review',
      description: 'Post-stay rating before the SD refund form.',
      path: guestReviewShellPath(propertySlug),
      icon: Star,
      openUsesEmbed: true,
    },
    {
      id: 'pay-parking',
      label: 'Pay Parking',
      description: 'Vehicle details when a booking includes paid parking.',
      path: guestPayParkingPreviewPath(propertySlug),
      copyPath: guestPayParkingPathPrefix(propertySlug),
      icon: Car,
      openUsesEmbed: true,
    },
  ];
}
