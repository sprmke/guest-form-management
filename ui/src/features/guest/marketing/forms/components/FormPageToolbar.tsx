import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

import { ThemeToggle } from '@/components/theme/MarketingThemeToggle';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ROUTES } from '@/config/routes';
import { getLoginHref } from '@/features/guest/auth/config/auth-navigation';
import { cn } from '@/lib/utils';

interface FormPageToolbarProps {
  /** Property slug for host bookings link (property-scoped forms only) */
  propertySlug?: string;
  className?: string;
}

const toolbarButtonClassName =
  'h-10 w-10 rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm';

export function FormPageToolbar({ propertySlug, className }: FormPageToolbarProps) {
  const adminHref = propertySlug ? ROUTES.property.bookings(propertySlug) : getLoginHref('host');

  const adminLabel = propertySlug ? 'Manage bookings' : 'Host sign in';

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-4 z-50 flex items-center justify-between px-4 sm:px-6',
        className
      )}
    >
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn('pointer-events-auto', toolbarButtonClassName)}
              asChild
            >
              <Link to={adminHref} aria-label={adminLabel}>
                <LayoutDashboard className="h-5 w-5" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{adminLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ThemeToggle
        variant="outline"
        size="icon"
        className={cn('pointer-events-auto', toolbarButtonClassName)}
      />
    </div>
  );
}
