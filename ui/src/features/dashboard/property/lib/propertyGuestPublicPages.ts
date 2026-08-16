import { BookOpen, Calendar, FileText, Home, MessageCircle } from 'lucide-react';

import {
  guestCalendarPath,
  guestFormPath,
  guestMessagesPreviewPath,
  guestPropertyPath,
  guestStayGuidePreviewPath,
} from '@/features/guest/lib/guestPublicPaths';

import type { LucideIcon } from 'lucide-react';

export type PropertyGuestPublicPage = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
};

/** Guest-facing property URLs hosts can open from the dashboard. */
export function buildPropertyGuestPublicPages(
  propertySlug: string,
  propertyId: string
): PropertyGuestPublicPage[] {
  return [
    { id: 'listing', label: 'Property', path: guestPropertyPath(propertySlug), icon: Home },
    { id: 'calendar', label: 'Calendar', path: guestCalendarPath(propertySlug), icon: Calendar },
    { id: 'form', label: 'Form', path: guestFormPath(propertySlug), icon: FileText },
    {
      id: 'messages',
      label: 'Messages',
      path: guestMessagesPreviewPath(propertySlug),
      icon: MessageCircle,
    },
    {
      id: 'stay-guide',
      label: 'Stay Guide',
      path: guestStayGuidePreviewPath(propertySlug, propertyId),
      icon: BookOpen,
    },
  ];
}
