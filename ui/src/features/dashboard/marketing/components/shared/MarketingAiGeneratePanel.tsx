import { useEffect, useMemo, useState } from 'react';

import { ChevronDown, Loader2, Sparkles } from 'lucide-react';

import {
  BackgroundOptionPreview,
  FontOptionPreview,
  LayoutOptionPreview,
  SuggestionThemePreview,
  VisualChoiceButton,
} from '@/features/dashboard/marketing/components/shared/CalendarAiGenerateVisuals';
import {
  CALENDAR_AI_BACKGROUND_OPTIONS,
  CALENDAR_AI_ELEMENT_OPTIONS,
  CALENDAR_AI_FONT_OPTIONS,
  CALENDAR_AI_LAYOUT_OPTIONS,
  CALENDAR_AI_SUGGESTIONS,
  CALENDAR_AI_SUGGESTIONS_PREVIEW_COUNT,
  DEFAULT_CALENDAR_AI_PREFERENCES,
  type CalendarAiElements,
  type CalendarAiGeneratePreferences,
  type CalendarAiSuggestion,
} from '@/features/dashboard/marketing/lib/calendarAiGenerateOptions';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type MarketingAiContextKey = 'propertyPhoto' | 'amenities' | 'availability';

export type MarketingAiGenerateInput = {
  prompt: string;
  includeContext: Record<MarketingAiContextKey, boolean>;
  preferences: CalendarAiGeneratePreferences;
};

export type MarketingAiGeneratePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'calendar' | 'design' | 'video';
  contextOptions?: Array<{
    key: MarketingAiContextKey;
    label: string;
    available: boolean;
  }>;
  suggestions?: CalendarAiSuggestion[];
  generating?: boolean;
  onGenerate: (input: MarketingAiGenerateInput) => void | Promise<void>;
};

const EMPTY_CONTEXT: Record<MarketingAiContextKey, boolean> = {
  propertyPhoto: true,
  amenities: true,
  availability: true,
};

/**
 * Shared Marketing Studio AI generate modal.
 * Split chrome: sticky header/footer, scrollable body only.
 */
export function MarketingAiGeneratePanel({
  open,
  onOpenChange,
  contentType,
  contextOptions = [],
  suggestions = contentType === 'calendar' ? CALENDAR_AI_SUGGESTIONS : [],
  generating = false,
  onGenerate,
}: MarketingAiGeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [includeContext, setIncludeContext] =
    useState<Record<MarketingAiContextKey, boolean>>(EMPTY_CONTEXT);
  const [preferences, setPreferences] = useState<CalendarAiGeneratePreferences>(
    DEFAULT_CALENDAR_AI_PREFERENCES
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);

  useEffect(() => {
    if (!open) {
      setPrompt('');
      setSelectedSuggestionId(null);
      setIncludeContext(EMPTY_CONTEXT);
      setPreferences(DEFAULT_CALENDAR_AI_PREFERENCES);
      setAdvancedOpen(false);
      setSuggestionsExpanded(false);
    }
  }, [open]);

  const visibleSuggestions = useMemo(() => {
    if (suggestionsExpanded || suggestions.length <= CALENDAR_AI_SUGGESTIONS_PREVIEW_COUNT) {
      return suggestions;
    }
    return suggestions.slice(0, CALENDAR_AI_SUGGESTIONS_PREVIEW_COUNT);
  }, [suggestions, suggestionsExpanded]);

  const canToggleSuggestions = suggestions.length > CALENDAR_AI_SUGGESTIONS_PREVIEW_COUNT;

  const setElement = (key: keyof CalendarAiElements, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      elements: { ...prev.elements, [key]: value },
    }));
  };

  const canGenerate = prompt.trim().length > 0 && !generating;

  const handleSuggestion = (suggestion: CalendarAiSuggestion) => {
    setSelectedSuggestionId(suggestion.id);
    setPrompt(suggestion.prompt);
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
      preferences,
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
      ? 'Creates Square, Portrait, and Landscape — edit any format after'
      : 'Creates a custom template from your description.';

  const showCalendarControls = contentType === 'calendar';

  const contextRows = useMemo(() => {
    const order: MarketingAiContextKey[] = ['propertyPhoto', 'amenities', 'availability'];
    const byKey = new Map(contextOptions.map((option) => [option.key, option]));
    return order.map((key) => {
      const option = byKey.get(key);
      return (
        option ?? {
          key,
          label:
            key === 'propertyPhoto'
              ? 'Property photo'
              : key === 'amenities'
                ? 'Amenities'
                : 'Availability',
          available: false,
        }
      );
    });
  }, [contextOptions]);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => {
        if (generating && !next) return;
        onOpenChange(next);
      }}
    >
      <ResponsiveModalContent
        sheetLayout="split"
        className={cn(
          'flex max-h-[min(92dvh,44rem)] w-full max-w-[min(calc(100vw-1.5rem),48rem)] flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-[min(94vw,48rem)] sm:p-0'
        )}
        aria-busy={generating || undefined}
        onPointerDownOutside={(event) => {
          if (generating) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (generating) event.preventDefault();
        }}
      >
        <ResponsiveModalHeader className="border-border/60 shrink-0 gap-0 border-b px-5 py-4 text-left sm:px-6">
          <ResponsiveModalTitle className="text-left">{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription className="text-left">
            {outcomeHint}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [-webkit-overflow-scrolling:touch] sm:px-6">
          <div className="space-y-7">
            {suggestions.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Suggestions</Label>
                  {canToggleSuggestions ? (
                    <button
                      type="button"
                      disabled={generating}
                      onClick={() => setSuggestionsExpanded((prev) => !prev)}
                      className="text-primary hover:text-primary/80 focus-visible:ring-ring min-h-[44px] cursor-pointer px-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
                    >
                      {suggestionsExpanded ? 'Show less' : 'View more'}
                    </button>
                  ) : null}
                </div>
                <div
                  className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                  role="group"
                  aria-label="Look suggestions"
                >
                  {visibleSuggestions.map((suggestion) => {
                    const active = selectedSuggestionId === suggestion.id;
                    return (
                      <button
                        key={suggestion.id}
                        type="button"
                        disabled={generating}
                        aria-pressed={active}
                        aria-label={`${suggestion.title}. ${suggestion.summary}`}
                        onClick={() => handleSuggestion(suggestion)}
                        className={cn(
                          'focus-visible:ring-ring flex min-h-[44px] cursor-pointer flex-col gap-2.5 rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50',
                          active
                            ? 'border-primary/50 bg-primary/10'
                            : 'border-border bg-background hover:bg-muted/50'
                        )}
                      >
                        <SuggestionThemePreview palette={suggestion.palette} />
                        <span className="px-0.5 pb-0.5">
                          <span className="text-foreground block text-sm font-semibold leading-tight">
                            {suggestion.title}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                            {suggestion.summary}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="marketing-ai-prompt">Look</Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {prompt.trim().length}/500
                </span>
              </div>
              <Textarea
                id="marketing-ai-prompt"
                value={prompt}
                onChange={(event) => {
                  setSelectedSuggestionId(null);
                  setPrompt(event.target.value);
                }}
                rows={4}
                className="min-h-[112px] resize-y text-[15px] leading-relaxed"
                placeholder="Pick a suggestion or describe the look…"
                disabled={generating}
                maxLength={500}
              />
            </section>

            {showCalendarControls ? (
              <section className="space-y-4">
                <Label>Style</Label>

                <div className="space-y-2">
                  <span className="text-muted-foreground text-xs font-medium">Layout</span>
                  <div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    role="group"
                    aria-label="Layout"
                  >
                    {CALENDAR_AI_LAYOUT_OPTIONS.map((option) => (
                      <VisualChoiceButton
                        key={option.value}
                        active={preferences.layoutArchetype === option.value}
                        disabled={generating}
                        title={option.label}
                        hint={option.hint}
                        preview={<LayoutOptionPreview option={option} />}
                        onClick={() =>
                          setPreferences((prev) => ({
                            ...prev,
                            layoutArchetype: option.value,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-muted-foreground text-xs font-medium">Type</span>
                  <div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    role="group"
                    aria-label="Type"
                  >
                    {CALENDAR_AI_FONT_OPTIONS.map((option) => (
                      <VisualChoiceButton
                        key={option.value}
                        active={preferences.fontPairing === option.value}
                        disabled={generating}
                        title={option.label}
                        hint={option.hint}
                        preview={<FontOptionPreview option={option} />}
                        onClick={() =>
                          setPreferences((prev) => ({
                            ...prev,
                            fontPairing: option.value,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-muted-foreground text-xs font-medium">Background</span>
                  <div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    role="group"
                    aria-label="Background"
                  >
                    {CALENDAR_AI_BACKGROUND_OPTIONS.map((option) => (
                      <VisualChoiceButton
                        key={option.value}
                        active={preferences.backgroundMood === option.value}
                        disabled={generating}
                        title={option.label}
                        hint={option.hint}
                        preview={<BackgroundOptionPreview option={option} />}
                        onClick={() =>
                          setPreferences((prev) => ({
                            ...prev,
                            backgroundMood: option.value,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {showCalendarControls ? (
              <Collapsible
                open={advancedOpen}
                onOpenChange={setAdvancedOpen}
                className="border-border/70 rounded-xl border"
              >
                <CollapsibleTrigger
                  disabled={generating}
                  className="text-foreground hover:bg-muted/40 focus-visible:ring-ring flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
                >
                  <span>{advancedOpen ? 'Hide advanced settings' : 'Show advanced settings'}</span>
                  <ChevronDown
                    className={cn(
                      'text-muted-foreground size-4 shrink-0 transition-transform duration-200',
                      advancedOpen && 'rotate-180'
                    )}
                    aria-hidden
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="border-border/60 space-y-5 border-t px-3.5 pb-4 pt-3.5">
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs font-medium">Show on calendar</p>
                    <div
                      className="divide-border/70 border-border/70 divide-y rounded-xl border"
                      role="group"
                      aria-label="Show on calendar"
                    >
                      {CALENDAR_AI_ELEMENT_OPTIONS.map((option) => {
                        const checked = preferences.elements[option.key];
                        const switchId = `calendar-ai-element-${option.key}`;
                        return (
                          <div
                            key={option.key}
                            className="flex min-h-[52px] items-center justify-between gap-3 px-3 py-2.5"
                          >
                            <label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer">
                              <span className="text-foreground block text-sm font-medium leading-tight">
                                {option.label}
                              </span>
                              <span className="text-muted-foreground block text-[11px] leading-tight">
                                {option.hint}
                              </span>
                            </label>
                            <Switch
                              id={switchId}
                              checked={checked}
                              disabled={generating}
                              onCheckedChange={(value) => setElement(option.key, value)}
                              aria-label={option.label}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs font-medium">Use when generating</p>
                    <div
                      className="divide-border/70 border-border/70 divide-y rounded-xl border"
                      role="group"
                      aria-label="Use when generating"
                    >
                      {contextRows.map((option) => {
                        const checked = option.available && includeContext[option.key];
                        const switchId = `calendar-ai-context-${option.key}`;
                        const unavailableHint =
                          option.key === 'propertyPhoto'
                            ? 'Add a property photo in settings'
                            : option.key === 'amenities'
                              ? 'Add amenities in property settings'
                              : 'Not available yet';
                        return (
                          <div
                            key={option.key}
                            className={cn(
                              'flex min-h-[52px] items-center justify-between gap-3 px-3 py-2.5',
                              !option.available && 'opacity-55'
                            )}
                          >
                            <label
                              htmlFor={switchId}
                              className={cn(
                                'min-w-0 flex-1',
                                option.available ? 'cursor-pointer' : 'cursor-not-allowed'
                              )}
                              title={option.available ? undefined : unavailableHint}
                            >
                              <span className="text-foreground block text-sm font-medium leading-tight">
                                {option.label}
                              </span>
                              {!option.available ? (
                                <span className="text-muted-foreground block text-[11px] leading-tight">
                                  {unavailableHint}
                                </span>
                              ) : null}
                            </label>
                            <Switch
                              id={switchId}
                              checked={checked}
                              disabled={generating || !option.available}
                              onCheckedChange={(value) =>
                                setIncludeContext((prev) => ({
                                  ...prev,
                                  [option.key]: value,
                                }))
                              }
                              aria-label={option.label}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <section className="space-y-3">
                <Label>Include</Label>
                <div
                  className="divide-border/70 border-border/70 divide-y rounded-xl border"
                  role="group"
                  aria-label="Context to include"
                >
                  {contextRows.map((option) => {
                    const checked = option.available && includeContext[option.key];
                    const switchId = `marketing-ai-context-${option.key}`;
                    return (
                      <div
                        key={option.key}
                        className={cn(
                          'flex min-h-[52px] items-center justify-between gap-3 px-3 py-2.5',
                          !option.available && 'opacity-55'
                        )}
                      >
                        <label
                          htmlFor={switchId}
                          className={cn(
                            'min-w-0 flex-1 text-sm font-medium',
                            option.available ? 'cursor-pointer' : 'cursor-not-allowed'
                          )}
                        >
                          {option.label}
                        </label>
                        <Switch
                          id={switchId}
                          checked={checked}
                          disabled={generating || !option.available}
                          onCheckedChange={(value) =>
                            setIncludeContext((prev) => ({
                              ...prev,
                              [option.key]: value,
                            }))
                          }
                          aria-label={option.label}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <p className="sr-only" aria-live="polite">
              {generating ? 'Generating templates. Please wait.' : ''}
            </p>
          </div>
        </div>

        <ResponsiveModalFooter className="border-border/60 shrink-0 gap-2 border-t px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
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
