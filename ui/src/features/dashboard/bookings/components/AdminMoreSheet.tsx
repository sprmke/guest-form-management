import { Link } from 'react-router-dom';

import { ChevronRight, LogOut } from 'lucide-react';

import { AccountAvatar } from '@/features/guest/account/components/AccountAvatar';
import { ModeSwitcher } from '@/features/guest/marketing/shared/components/ModeSwitcher';

import type { SidebarNavItem } from '@/features/dashboard/bookings/lib/adminSidebarNav';
import {
  isOrgAdminPath,
  isParkingAdminPath,
  isPropertyAdminPath,
} from '@/features/dashboard/bookings/lib/adminSidebarNav';
import { ListingVerificationSidebarCta } from '@/features/dashboard/org/components/listing-authorization/ListingVerificationSidebarCta';
import { SectionNavIssueDot } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { GetVerifiedSidebarCta } from '@/features/dashboard/org/components/verification/GetVerifiedModal';

import { scrollAdminViewToTop } from '@/components/navigation/ScrollToTop';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
} from '@/components/ui/bottom-sheet';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moreItems: SidebarNavItem[];
  activeNavHref: string | null;
  pathname: string;
  propertySettingsHasIssues: boolean;
  parkingSettingsHasIssues: boolean;
  orgSettingsHasIssues: boolean;
  hostAnnouncementsHaveUnread: boolean;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  email: string | null;
  signOut: () => Promise<void>;
  onOpenProfile: () => void;
  onSignOutNavigate: () => void;
  superAdmin?: boolean;
};

export function AdminMoreSheet({
  open,
  onOpenChange,
  moreItems,
  activeNavHref,
  pathname,
  propertySettingsHasIssues,
  parkingSettingsHasIssues,
  orgSettingsHasIssues,
  hostAnnouncementsHaveUnread,
  displayName,
  avatarUrl,
  initials,
  email,
  signOut,
  onOpenProfile,
  onSignOutNavigate,
  superAdmin = false,
}: Props) {
  const handleSignOut = async () => {
    onOpenChange(false);
    try {
      await signOut();
      onSignOutNavigate();
    } catch (err) {
      console.error('[AdminMoreSheet] signOut failed', err);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      {/*
        `layout="split"` + definite `h-[92dvh]`: only the nav list scrolls.
        Theme/mode + profile + sign-out stay pinned. (max-height alone / max-content
        height lets WebKit scroll the whole sheet.)
      */}
      <BottomSheetContent
        layout="split"
        className="!h-[92dvh] !max-h-[92dvh] gap-0 overflow-hidden px-0 pb-0"
      >
        <BottomSheetHeader className="sr-only">
          <BottomSheetTitle>More</BottomSheetTitle>
          <BottomSheetDescription>Additional navigation and account</BottomSheetDescription>
        </BottomSheetHeader>

        <nav
          className="min-h-0 flex-[1_1_0] space-y-1 overflow-y-auto overscroll-contain px-4 py-1 [-webkit-overflow-scrolling:touch]"
          aria-label="More"
        >
          {moreItems.map((item) => {
            const { label, href, Icon } = item;
            if (!href) return null;
            const active = href === activeNavHref;
            const showSettingsIssue =
              label === 'Settings' &&
              ((propertySettingsHasIssues && isPropertyAdminPath(pathname)) ||
                (parkingSettingsHasIssues && isParkingAdminPath(pathname)) ||
                (orgSettingsHasIssues && isOrgAdminPath(pathname)));
            const showAnnouncementsBadge = label === 'Announcements' && hostAnnouncementsHaveUnread;

            return (
              <Link
                key={href}
                to={href}
                onClick={() => {
                  onOpenChange(false);
                  scrollAdminViewToTop('auto');
                }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted/60 active:bg-muted'
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate">{label}</span>
                  {showAnnouncementsBadge || showSettingsIssue ? (
                    <SectionNavIssueDot className="ml-auto" />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="bg-card shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="border-border/60 flex items-center gap-2 border-t py-3">
            <ThemeToggle
              variant="icon"
              className={cn(
                'border-border/60 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                'size-11 shrink-0 rounded-xl shadow-none'
              )}
            />
            <ModeSwitcher className="min-w-0 flex-1" />
          </div>

          <div className="border-border/60 space-y-2 border-t pt-3">
            <div className="flex min-h-[44px] items-center gap-1 px-0.5">
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onOpenProfile();
                }}
                className={cn(
                  'hover:bg-muted/60 active:bg-muted/80',
                  'focus-visible:ring-ring flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2'
                )}
                aria-label={`View profile, ${displayName}`}
              >
                <AccountAvatar
                  avatarUrl={avatarUrl}
                  initials={initials}
                  className="ring-background h-10 w-10 shrink-0 shadow-sm ring-2"
                  fallbackClassName="text-sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-foreground block truncate text-sm font-semibold leading-tight">
                    {displayName}
                  </span>
                  {email ? (
                    <span className="text-muted-foreground mt-0.5 block truncate text-xs leading-tight">
                      {email}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden />
              </button>
              {!superAdmin ? (
                isPropertyAdminPath(pathname) || isParkingAdminPath(pathname) ? (
                  <ListingVerificationSidebarCta variant="icon" />
                ) : (
                  <GetVerifiedSidebarCta variant="icon" />
                )
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className={cn(
                'border-destructive/25 bg-destructive/5 text-destructive',
                'hover:bg-destructive/10 active:bg-destructive/15',
                'mt-0.5 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors'
              )}
            >
              <LogOut className="size-3.5 shrink-0" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
