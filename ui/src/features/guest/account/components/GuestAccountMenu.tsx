import { Link } from 'react-router-dom';

import { LogOut } from 'lucide-react';

import { useGuestProfile } from '@/features/guest/account/hooks/useGuestProfile';
import { useGuestSignOut } from '@/features/guest/account/hooks/useGuestSignOut';
import {
  guestInitials,
  resolveGuestAvatarUrl,
  resolveGuestDisplayName,
} from '@/features/guest/account/lib/guestAccountIdentity';
import {
  GUEST_ACCOUNT_MESSAGES_PATH,
  GUEST_ACCOUNT_PROFILE_PATH,
  GUEST_ACCOUNT_STAYS_PATH,
  GUEST_ACCOUNT_WISHLIST_PATH,
} from '@/features/guest/account/lib/guestAccountPaths';
import { useGuestSession } from '@/features/guest/auth/hooks/useGuestSession';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const menuLinks = [
  { href: GUEST_ACCOUNT_PROFILE_PATH, label: 'Profile' },
  { href: GUEST_ACCOUNT_STAYS_PATH, label: 'Stays' },
  { href: GUEST_ACCOUNT_WISHLIST_PATH, label: 'Wishlist' },
  { href: GUEST_ACCOUNT_MESSAGES_PATH, label: 'Messages' },
] as const;

export function GuestAccountMenu() {
  const { status, session } = useGuestSession();
  const { data: profile } = useGuestProfile({ enabled: status === 'authenticated' });
  const signOut = useGuestSignOut();

  if (status !== 'authenticated' || !session) {
    return null;
  }

  const displayName = resolveGuestDisplayName(session, profile);
  const avatarUrl = resolveGuestAvatarUrl(session, profile);
  const initials = guestInitials(displayName);

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
      <DropdownMenuContent align="end" className="w-52">
        {menuLinks.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link to={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void handleSignOut()}>
          <LogOut className="mr-2 size-4" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
