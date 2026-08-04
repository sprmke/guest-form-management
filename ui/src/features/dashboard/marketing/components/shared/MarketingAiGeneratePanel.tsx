import { useMemo, useState } from 'react';

import { Loader2, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type MarketingAiContextKey = 'propertyPhoto' | 'amenities' | 'availability';

export type MarketingAiGeneratePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'calendar' | 'design' | 'video';
  /** Context chips that can be toggled off before generate. */
  contextOptions?: Array<{ key: MarketingAiContextKey; label: string; available: boolean }>;
  vibeChips?: string[];
  generating?: boolean;
  onGenerate: (input: {
    prompt: string;
    includeContext: Record<MarketingAiContextKey, boolean>;
  }) => void | Promise<void>;
};

const DEFAULT_CALENDAR_VIBES = [
  'Soft pastel availability',
  'Sunny weekend promo',
  'Botanical calm',
  'Dreamy dusk',
  'Clean editorial',
];

/**
 * Shared Marketing Studio AI generate sheet.
 * Calendar MVP: prompt + vibe chips + removable context → one generation.
 */
export function MarketingAiGeneratePanel({
  open,
  onOpenChange,
  contentType,
  contextOptions = [],
  vibeChips = DEFAULT_CALENDAR_VIBES,
  generating = false,
  onGenerate,
}: MarketingAiGeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [includeContext, setIncludeContext] = useState<Record<MarketingAiContextKey, boolean>>({
    propertyPhoto: true,
    amenities: true,
    availability: true,
  });

  const visibleContext = useMemo(
    () => contextOptions.filter((option) => option.available),
    [contextOptions]
  );

  const handleVibe = (chip: string) => {
    setPrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip;
      if (trimmed.toLowerCase().includes(chip.toLowerCase())) return trimmed;
      return `${trimmed}. ${chip}`;
    });
  };

  const handleGenerate = async () => {
    await onGenerate({
      prompt: prompt.trim(),
      includeContext: {
        propertyPhoto: includeContext.propertyPhoto,
        amenities: includeContext.amenities,
        availability: includeContext.availability,
      },
    });
  };

  const title =
    contentType === 'calendar'
      ? 'Generate calendar'
      : contentType === 'design'
        ? 'Generate design'
        : 'Generate video';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        aria-describedby={undefined}
      >
        <SheetHeader className="border-border space-y-1 border-b px-4 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" aria-hidden />
            {title}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Describe the look you want, then generate a custom template.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="marketing-ai-prompt">Prompt</Label>
            <Textarea
              id="marketing-ai-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              className="min-h-[96px]"
              placeholder="Soft mint bubbles, weekend availability…"
              disabled={generating}
            />
          </div>

          {vibeChips.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {vibeChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={generating}
                    onClick={() => handleVibe(chip)}
                    className={cn(
                      'border-border bg-background hover:bg-muted/60 focus-visible:ring-ring',
                      'inline-flex min-h-[44px] cursor-pointer items-center rounded-full border px-3 text-sm',
                      'transition-colors focus-visible:outline-none focus-visible:ring-2'
                    )}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {visibleContext.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">Include</p>
              <div className="flex flex-wrap gap-2">
                {visibleContext.map((option) => {
                  const active = includeContext[option.key];
                  return (
                    <button
                      key={option.key}
                      type="button"
                      disabled={generating}
                      aria-pressed={active}
                      onClick={() =>
                        setIncludeContext((prev) => ({
                          ...prev,
                          [option.key]: !prev[option.key],
                        }))
                      }
                      className={cn(
                        'focus-visible:ring-ring inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2',
                        active
                          ? 'border-primary/40 bg-primary/10 text-foreground'
                          : 'border-border bg-background text-muted-foreground'
                      )}
                    >
                      {option.label}
                      {active ? <X className="size-3.5 opacity-70" aria-hidden /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-border mt-auto gap-2 border-t px-4 py-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            disabled={generating}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-[44px] gap-2"
            disabled={generating}
            onClick={() => void handleGenerate()}
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            Generate
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
