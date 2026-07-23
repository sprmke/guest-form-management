import { HelpCircle } from 'lucide-react';

import { RequiredMark } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';

import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Props = {
  htmlFor?: string;
  label: string;
  help: string;
  required?: boolean;
  className?: string;
};

export function VerificationFieldLabel({
  htmlFor,
  label,
  help,
  required = false,
  className,
}: Props) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="mb-0">
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors"
              aria-label={`About ${label}`}
            >
              <HelpCircle className="size-3.5" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="start"
            className="max-w-[min(calc(100vw-2rem),18rem)] text-left text-xs leading-snug"
          >
            {help}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
