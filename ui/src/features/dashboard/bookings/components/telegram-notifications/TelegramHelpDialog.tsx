import { HelpCircle, X } from 'lucide-react';

import type { TelegramHelpSection } from '@/features/dashboard/bookings/lib/telegramHelpContent';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  sections: TelegramHelpSection[];
  triggerLabel?: string;
  className?: string;
};

export function TelegramHelpDialog({ title, sections, triggerLabel = 'Help', className }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:text-foreground min-h-[44px] gap-1.5 px-2.5',
            className
          )}
        >
          <HelpCircle className="size-4 shrink-0" aria-hidden />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex max-h-[min(90dvh,52rem)] w-full max-w-[min(calc(100vw-1.5rem),42rem)] flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-[min(92vw,42rem)]'
        )}
      >
        <div className="border-border/60 flex shrink-0 items-center gap-3 border-b px-4 sm:px-6">
          <DialogHeader className="min-h-[56px] flex-1 justify-center space-y-0 py-3.5 pr-0">
            <DialogTitle className="text-left text-base leading-snug sm:text-lg">
              {title}
            </DialogTitle>
          </DialogHeader>
          <DialogClose
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <X className="size-5 shrink-0" aria-hidden />
          </DialogClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          <div className="space-y-8">
            {sections.map((section, sectionIndex) => (
              <section key={section.heading ?? sectionIndex} className="space-y-4">
                {section.heading ? (
                  <h3 className="text-foreground text-sm font-semibold tracking-tight sm:text-[15px]">
                    {section.heading}
                  </h3>
                ) : null}
                <ol className="space-y-4">
                  {section.steps.map((step, stepIndex) => (
                    <li key={step.title} className="flex gap-3.5 sm:gap-4">
                      <span
                        className="bg-muted text-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums sm:size-8 sm:text-sm"
                        aria-hidden
                      >
                        {stepIndex + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-foreground text-sm font-medium leading-snug sm:text-[15px]">
                          {step.title}
                        </p>
                        <p className="text-muted-foreground text-sm leading-relaxed sm:text-[15px] sm:leading-relaxed">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                {section.note ? (
                  <p className="bg-muted/50 text-muted-foreground border-border/50 rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed sm:text-sm">
                    {section.note}
                  </p>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
