import { useNavigate } from 'react-router-dom';

import { ChevronDown, LogOut, Users } from 'lucide-react';

import { useAdminSession } from '@/features/dashboard/bookings/hooks/useAdminSession';
import {
  HOST_LOGIN_PATH,
  hostGoogleOAuthRedirectTo,
  hostLoginPath,
} from '@/features/guest/auth/lib/hostAuthPaths';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Props = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

function ProfileAvatar({
  avatarUrl,
  initial,
  size = 'lg',
}: {
  avatarUrl: string | null;
  initial: string;
  size?: 'lg' | 'sm';
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-primary/10 text-primary font-bold',
        size === 'lg' ? 'size-16 text-lg sm:size-[4.5rem]' : 'size-10 text-sm'
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </div>
  );
}

export function OnboardingProfileHeader({ name, email, avatarUrl }: Props) {
  const navigate = useNavigate();
  const { signOut } = useAdminSession();

  const displayName = name?.trim() || email || 'Account';
  const initial = (displayName.trim()[0] ?? '?').toUpperCase();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate(hostLoginPath('/onboarding'), { replace: true });
    } catch (err) {
      console.error('[OnboardingProfileHeader] signOut failed', err);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await signOut();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: hostGoogleOAuthRedirectTo(HOST_LOGIN_PATH, '/onboarding'),
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) {
        console.error('[OnboardingProfileHeader] switch account failed', error.message);
        navigate(hostLoginPath('/onboarding'), { replace: true });
      }
    } catch (err) {
      console.error('[OnboardingProfileHeader] switch account failed', err);
      navigate(hostLoginPath('/onboarding'), { replace: true });
    }
  };

  return (
    <header className="flex justify-center px-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'group flex max-w-full flex-col items-center rounded-2xl px-2 py-1 text-center',
              'focus-visible:ring-ring transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'hover:opacity-95 active:opacity-90'
            )}
            aria-label="Account menu"
          >
            <div className="relative">
              <div
                className={cn(
                  'ring-primary/15 ring-offset-background overflow-hidden rounded-full ring-2 ring-offset-2',
                  'group-hover:ring-primary/30 group-data-[state=open]:ring-primary/40 transition-shadow'
                )}
              >
                <ProfileAvatar avatarUrl={avatarUrl} initial={initial} size="lg" />
              </div>
              <span
                className={cn(
                  'border-background bg-card text-muted-foreground absolute -bottom-0.5 -right-0.5',
                  'flex size-7 items-center justify-center rounded-full border-2 shadow-sm',
                  'group-data-[state=open]:bg-muted transition-colors'
                )}
                aria-hidden
              >
                <ChevronDown
                  className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  strokeWidth={2.25}
                />
              </span>
            </div>

            <div className="mt-3 min-w-0 max-w-[min(100%,18rem)] space-y-0.5">
              <p className="text-foreground truncate text-base font-semibold tracking-tight sm:text-lg">
                {displayName}
              </p>
              {email ? (
                <p className="text-muted-foreground truncate text-xs sm:text-sm">{email}</p>
              ) : null}
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="center"
          sideOffset={10}
          className="w-[min(calc(100vw-2rem),16.5rem)] rounded-xl p-0"
        >
          <div className="flex items-center gap-3 px-3.5 py-3">
            <ProfileAvatar avatarUrl={avatarUrl} initial={initial} size="sm" />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-foreground truncate text-sm font-semibold leading-tight">
                {displayName}
              </p>
              {email ? (
                <p className="text-muted-foreground mt-0.5 truncate text-xs leading-tight">
                  {email}
                </p>
              ) : null}
            </div>
          </div>

          <DropdownMenuSeparator className="mx-0" />

          <div className="p-1.5">
            <DropdownMenuItem
              className="min-h-[44px] cursor-pointer rounded-lg px-3 py-2.5"
              onClick={() => void handleSwitchAccount()}
            >
              <Users className="size-4" aria-hidden />
              Switch account
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive min-h-[44px] cursor-pointer rounded-lg px-3 py-2.5"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function readGoogleAvatarUrl(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  const avatar = metadata.avatar_url ?? metadata.picture;
  return typeof avatar === 'string' && avatar.trim() ? avatar.trim() : null;
}
