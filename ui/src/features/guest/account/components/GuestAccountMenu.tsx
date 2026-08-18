import { Link } from 'react-router-dom';

import { LayoutDashboard, LogOut } from 'lucide-react';

import { useGuestProfile } from '@/features/guest/account/hooks/useGuestProfile';
import { useGuestSignOut } from '@/features/guest/account/hooks/useGuestSignOut';
import {
  guestInitials,
  resolveGuestAvatarUrl,
  resolveGuestDisplayName,
} from '@/features/guest/account/lib/guestAccountIdentity';
import { GUEST_ACCOUNT_NAV_ITEMS } from '@/features/guest/account/lib/guestAccountNav';
import { getHostMarketingNavCta } from '@/features/guest/auth/config/auth-navigation';
import { useGuestSession } from '@/features/guest/auth/hooks/useGuestSession';

import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function GuestAccountMenu() {
  const { status, session } = useGuestSession();
  const { data: profile } = useGuestProfile({ enabled: status === 'authenticated' });
  const { data: orgsData } = useOrganizations({ enabled: status === 'authenticated' });
  const signOut = useGuestSignOut();

  if (status !== 'authenticated' || !session) {
    return null;
  }

  const displayName = resolveGuestDisplayName(session, profile);
  const avatarUrl = resolveGuestAvatarUrl(session, profile);
  const initials = guestInitials(displayName);
  const hasHostAccess = (orgsData?.organizations?.length ?? 0) > 0;
  const dashboardHref = getHostMarketingNavCta(true).href;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-full p-0"
          aria-label="Account menu"
        >
          <Avatar className="size-9">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60] w-52">
        {hasHostAccess ? (
          <>
            <DropdownMenuLabel className="!text-[10px]">Host</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to={dashboardHref}>
                  <LayoutDashboard aria-hidden />
                  Dashboard
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="!text-[10px]">Explore</DropdownMenuLabel>
          </>
        ) : null}
        <DropdownMenuGroup>
          {GUEST_ACCOUNT_NAV_ITEMS.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link to={item.href}>{item.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void handleSignOut()}>
          <LogOut aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
