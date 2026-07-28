import { Link } from 'react-router-dom';

import { useGuestProfile } from '@/features/guest/account/hooks/useGuestProfile';
import { useGuestSignOut } from '@/features/guest/account/hooks/useGuestSignOut';
import { GUEST_ACCOUNT_PROFILE_PATH } from '@/features/guest/account/lib/guestAccountPaths';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function GuestAccountSettingsPage() {
  const { data: profile, isLoading } = useGuestProfile();
  const signOut = useGuestSignOut();

  const handleSignOut = async () => {
    await signOut();
  };

  if (isLoading) {
    return <div className="bg-muted h-40 animate-pulse rounded-2xl" />;
  }

  return (
    <div className="border-border bg-card w-full overflow-hidden rounded-2xl border shadow-sm">
      <div className="space-y-1 p-6 sm:p-8 lg:p-10">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Email</p>
        <p className="text-foreground text-sm">{profile?.email ?? '—'}</p>
      </div>

      <Separator />

      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:p-8 lg:p-10">
        <Button asChild variant="outline" className="min-h-[44px] sm:flex-1">
          <Link to={GUEST_ACCOUNT_PROFILE_PATH}>Edit profile</Link>
        </Button>
        <Button
          variant="secondary"
          className="min-h-[44px] sm:flex-1"
          onClick={() => void handleSignOut()}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
