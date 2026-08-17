import { Link } from 'react-router-dom';

import { LogOut } from 'lucide-react';

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
  orgSettingsHasIssues: boolean;
  displayName: string;
  initial: string;
  email: string | null;
  signOut: () => Promise<void>;
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
  orgSettingsHasIssues,
  displayName,
  initial,
  email,
  signOut,
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
      <BottomSheetContent className="gap-0">
        <BottomSheetHeader className="sr-only">
          <BottomSheetTitle>More</BottomSheetTitle>
          <BottomSheetDescription>Additional navigation and account</BottomSheetDescription>
        </BottomSheetHeader>

        {moreItems.length > 0 ? (
          <nav className="space-y-1 py-1" aria-label="More">
            {moreItems.map((item) => {
              const { label, href, Icon } = item;
              if (!href) return null;
              const active = href === activeNavHref;
              const showSettingsIssue =
                label === 'Settings' &&
                ((propertySettingsHasIssues && isPropertyAdminPath(pathname)) ||
                  (orgSettingsHasIssues && isOrgAdminPath(pathname)));

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
                    {showSettingsIssue ? <SectionNavIssueDot className="ml-auto" /> : null}
                  </span>
                </Link>
              );
            })}
          </nav>
        ) : null}

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

        <div className="border-border/60 space-y-3 border-t pt-3">
          <div className="flex items-center gap-3 px-1">
            <div className="gradient-primary text-primary-foreground ring-background flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ring-2">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-semibold capitalize leading-tight">
                {displayName}
              </p>
              {email ? (
                <p className="text-muted-foreground mt-0.5 truncate text-xs leading-tight">
                  {email}
                </p>
              ) : null}
            </div>
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
      </BottomSheetContent>
    </BottomSheet>
  );
}
