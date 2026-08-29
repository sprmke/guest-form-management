import { Link } from 'react-router-dom';

import { guestLoginPath } from '@/features/guest/auth/lib/guestAuthPaths';
import { publicContactPath } from '@/features/guest/marketing/contact/lib/publicContactParams';

import type { SupportTicketCategory } from '@/features/dashboard/help-support/lib/supportTicketSchema';

import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: SupportTicketCategory;
  subject?: string;
};

export function PublicContactSignInDialog({ open, onOpenChange, category, subject }: Props) {
  const redirectPath = publicContactPath({ category, subject });
  const signInHref = guestLoginPath(redirectPath);

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="gap-0 p-0 sm:max-w-md">
        <ResponsiveModalHeader className="border-border border-b px-5 pb-4 pt-5 text-left sm:px-6">
          <ResponsiveModalTitle>Sign in to continue</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Use your explore account to send a ticket. Hosts can also open tickets from Help &amp;
            Support in the dashboard.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <ResponsiveModalFooter className="gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="min-h-11 w-full sm:w-auto" asChild>
            <Link to={signInHref} onClick={() => onOpenChange(false)}>
              Sign in
            </Link>
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
