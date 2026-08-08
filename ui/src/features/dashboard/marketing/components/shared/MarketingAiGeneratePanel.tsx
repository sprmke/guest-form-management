import { useEffect, useMemo, useState } from 'react';

import { Check, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
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
];

const EMPTY_CONTEXT: Record<MarketingAiContextKey, boolean> = {
  propertyPhoto: true,
  amenities: true,
  availability: true,
};

/**
 * Shared Marketing Studio AI generate modal.
 * Matches Publish / Save template dialog chrome (ResponsiveModal defaults).
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
  const [includeContext, setIncludeContext] =
    useState<Record<MarketingAiContextKey, boolean>>(EMPTY_CONTEXT);

  useEffect(() => {
    if (!open) {
      setPrompt('');
      setIncludeContext(EMPTY_CONTEXT);
    }
  }, [open]);

  const visibleContext = useMemo(
    () => contextOptions.filter((option) => option.available),
    [contextOptions]
  );

  const canGenerate = prompt.trim().length > 0 && !generating;

  const handleVibe = (chip: string) => {
    setPrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip;
      if (trimmed.toLowerCase().includes(chip.toLowerCase())) return trimmed;
      return `${trimmed}. ${chip}`;
    });
  };

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || generating) return;
    await onGenerate({
      prompt: trimmed,
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

  const outcomeHint =
    contentType === 'calendar'
      ? 'Adds custom templates for Square, Portrait, and Landscape.'
      : 'Creates a custom template from your description.';

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => {
        if (generating && !next) return;
        onOpenChange(next);
      }}
    >
      <ResponsiveModalContent
        className="max-w-[min(calc(100vw-1.5rem),28rem)]"
        aria-busy={generating || undefined}
        onPointerDownOutside={(event) => {
          if (generating) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (generating) event.preventDefault();
        }}
      >
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{outcomeHint}</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="marketing-ai-prompt">Look</Label>
            <Textarea
              id="marketing-ai-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              className="min-h-[88px] resize-none"
              placeholder="Soft mint bubbles, weekend availability…"
              disabled={generating}
              maxLength={500}
            />
          </div>

          {vibeChips.length > 0 ? (
            <div className="space-y-2">
              <Label>Suggestions</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Look suggestions">
                {vibeChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={generating}
                    onClick={() => handleVibe(chip)}
                    className={cn(
                      'border-border bg-background hover:bg-muted/60 focus-visible:ring-ring',
                      'inline-flex min-h-[44px] cursor-pointer items-center rounded-md border px-3 text-sm',
                      'transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50'
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
              <Label>Include</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Context to include">
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
                        'focus-visible:ring-ring inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50',
                        active
                          ? 'border-primary/40 bg-primary/10 text-foreground'
                          : 'border-border bg-background text-muted-foreground'
                      )}
                    >
                      {active ? <Check className="size-3.5 opacity-70" aria-hidden /> : null}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <p className="text-muted-foreground sr-only" aria-live="polite">
            {generating ? 'Generating templates. Please wait.' : ''}
          </p>
        </div>

        <ResponsiveModalFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={generating}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={!canGenerate}
            onClick={() => void handleGenerate()}
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            {generating ? 'Generating…' : 'Generate'}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
