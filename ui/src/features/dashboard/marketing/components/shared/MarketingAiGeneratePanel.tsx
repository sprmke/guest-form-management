import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ChevronDown, Loader2, Sparkles } from 'lucide-react';

import {
  BackgroundOptionPreview,
  FontOptionPreview,
  LayoutOptionPreview,
  SuggestionThemePreview,
  VisualChoiceButton,
} from '@/features/dashboard/marketing/components/shared/CalendarAiGenerateVisuals';
import {
  DesignBackgroundOptionPreview,
  DesignCategoryChips,
  DesignFontOptionPreview,
  DesignLayoutOptionPreview,
  DesignSuggestionPreview,
} from '@/features/dashboard/marketing/components/shared/DesignAiGenerateVisuals';
import {
  VideoCategoryChips,
  VideoDurationOptionPreview,
  VideoFontOptionPreview,
  VideoMotionOptionPreview,
  VideoSuggestionPreview,
} from '@/features/dashboard/marketing/components/shared/VideoAiGenerateVisuals';
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
import {
  DEFAULT_DESIGN_AI_PREFERENCES,
  DESIGN_AI_BACKGROUND_OPTIONS,
  DESIGN_AI_DEFAULT_CONTENTS,
  DESIGN_AI_FONT_OPTIONS,
  DESIGN_AI_LAYOUT_OPTIONS,
  DESIGN_AI_SUGGESTIONS,
  type DesignAiGeneratePreferences,
  type DesignAiSuggestion,
} from '@/features/dashboard/marketing/lib/designAiGenerateOptions';
import {
  DEFAULT_VIDEO_AI_PREFERENCES,
  VIDEO_AI_CATEGORY_LABELS,
  VIDEO_AI_DEFAULT_CONTENTS,
  VIDEO_AI_DURATION_OPTIONS,
  VIDEO_AI_FONT_OPTIONS,
  VIDEO_AI_MOTION_OPTIONS,
  VIDEO_AI_SUGGESTIONS,
  type VideoAiGeneratePreferences,
  type VideoAiSuggestion,
} from '@/features/dashboard/marketing/lib/videoAiGenerateOptions';

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

export type MarketingAiContextKey =
  'propertyPhoto' | 'amenities' | 'availability' | 'orgLogo' | 'propertyName' | 'cta';

export type MarketingAiGenerateInput =
  | {
      prompt: string;
      includeContext: Record<MarketingAiContextKey, boolean>;
      preferences: CalendarAiGeneratePreferences;
    }
  | {
      prompt: string;
      includeContext: Record<MarketingAiContextKey, boolean>;
      preferences: DesignAiGeneratePreferences;
    }
  | {
      prompt: string;
      includeContext: Record<MarketingAiContextKey, boolean>;
      preferences: VideoAiGeneratePreferences;
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
  suggestions?: CalendarAiSuggestion[] | DesignAiSuggestion[] | VideoAiSuggestion[];
  generating?: boolean;
  onGenerate: (input: MarketingAiGenerateInput) => void | Promise<void>;
};

function defaultIncludeContext(
  contentType: MarketingAiGeneratePanelProps['contentType']
): Record<MarketingAiContextKey, boolean> {
  if (contentType === 'calendar') {
    return {
      propertyPhoto: true,
      amenities: true,
      availability: true,
      orgLogo: false,
      propertyName: false,
      cta: false,
    };
  }
  return {
    propertyPhoto: true,
    amenities: false,
    availability: false,
    orgLogo: true,
    propertyName: true,
    cta: true,
  };
}

function isCalendarSuggestion(
  suggestion: CalendarAiSuggestion | DesignAiSuggestion | VideoAiSuggestion
): suggestion is CalendarAiSuggestion {
  return 'palette' in suggestion && 'canvas' in suggestion.palette;
}

function isVideoSuggestion(
  suggestion: CalendarAiSuggestion | DesignAiSuggestion | VideoAiSuggestion
): suggestion is VideoAiSuggestion {
  return 'sceneHint' in suggestion;
}

function contextUnavailableHint(key: MarketingAiContextKey): string {
  if (key === 'propertyPhoto') return 'Add a property photo in settings';
  if (key === 'amenities') return 'Add amenities in property settings';
  if (key === 'availability') return 'Not available yet';
  if (key === 'orgLogo') return 'Add an org logo in settings';
  if (key === 'propertyName') return 'Property name not available';
  return 'Not available yet';
}

function GenerateFieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-muted/40 space-y-3.5 rounded-2xl p-4 sm:p-5">
      <h3 className="text-foreground text-[15px] font-semibold leading-none tracking-tight">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function CountedTextarea({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
  rows,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  rows: number;
  className?: string;
}) {
  return (
    <div className="relative">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className={cn('resize-y pb-8 text-[15px] leading-relaxed', className)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={500}
        aria-describedby={`${id}-count`}
      />
      <span
        id={`${id}-count`}
        className="text-muted-foreground pointer-events-none absolute bottom-2.5 right-3 text-[11px] tabular-nums"
      >
        {value.trim().length}/500
      </span>
    </div>
  );
}

/**
 * Shared Marketing Studio AI generate modal.
 * Split chrome: sticky header/footer, scrollable body only.
 */
const SUGGESTIONS_PREVIEW_COUNT = CALENDAR_AI_SUGGESTIONS_PREVIEW_COUNT;

function defaultSuggestionsFor(
  contentType: MarketingAiGeneratePanelProps['contentType']
): CalendarAiSuggestion[] | DesignAiSuggestion[] | VideoAiSuggestion[] {
  if (contentType === 'calendar') return CALENDAR_AI_SUGGESTIONS;
  if (contentType === 'video') return VIDEO_AI_SUGGESTIONS;
  return DESIGN_AI_SUGGESTIONS;
}

export function MarketingAiGeneratePanel({
  open,
  onOpenChange,
  contentType,
  contextOptions = [],
  suggestions = defaultSuggestionsFor(contentType),
  generating = false,
  onGenerate,
}: MarketingAiGeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [includeContext, setIncludeContext] = useState<Record<MarketingAiContextKey, boolean>>(
    defaultIncludeContext(contentType)
  );
  const [calendarPreferences, setCalendarPreferences] = useState<CalendarAiGeneratePreferences>(
    DEFAULT_CALENDAR_AI_PREFERENCES
  );
  const [designPreferences, setDesignPreferences] = useState<DesignAiGeneratePreferences>(
    DEFAULT_DESIGN_AI_PREFERENCES
  );
  const [videoPreferences, setVideoPreferences] = useState<VideoAiGeneratePreferences>(
    DEFAULT_VIDEO_AI_PREFERENCES
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);

  const isCalendar = contentType === 'calendar';
  const isDesign = contentType === 'design';
  const isVideo = contentType === 'video';

  useEffect(() => {
    if (!open) {
      setPrompt('');
      setSelectedSuggestionId(null);
      setIncludeContext(defaultIncludeContext(contentType));
      setCalendarPreferences(DEFAULT_CALENDAR_AI_PREFERENCES);
      setDesignPreferences(DEFAULT_DESIGN_AI_PREFERENCES);
      setVideoPreferences(DEFAULT_VIDEO_AI_PREFERENCES);
      setAdvancedOpen(false);
      setSuggestionsExpanded(false);
    }
  }, [open, contentType]);

  // When the design/video category changes, repopulate content with the category default unless
  // the user has already typed custom content (only overwrite on the initial open / explicit change).
  const prevCategoryRef = useRef(designPreferences.category);
  useEffect(() => {
    if (!isDesign) return;
    const nextCategory = designPreferences.category;
    if (prevCategoryRef.current === nextCategory) return;
    prevCategoryRef.current = nextCategory;
    setDesignPreferences((prev) => ({
      ...prev,
      content: DESIGN_AI_DEFAULT_CONTENTS[nextCategory],
    }));
  }, [isDesign, designPreferences.category]);

  const prevVideoCategoryRef = useRef(videoPreferences.category);
  useEffect(() => {
    if (!isVideo) return;
    const nextCategory = videoPreferences.category;
    if (prevVideoCategoryRef.current === nextCategory) return;
    prevVideoCategoryRef.current = nextCategory;
    setVideoPreferences((prev) => ({
      ...prev,
      content: VIDEO_AI_DEFAULT_CONTENTS[nextCategory],
    }));
  }, [isVideo, videoPreferences.category]);

  const visibleSuggestions = useMemo(() => {
    if (suggestionsExpanded || suggestions.length <= SUGGESTIONS_PREVIEW_COUNT) {
      return suggestions;
    }
    return suggestions.slice(0, SUGGESTIONS_PREVIEW_COUNT);
  }, [suggestions, suggestionsExpanded]);

  const canToggleSuggestions = suggestions.length > SUGGESTIONS_PREVIEW_COUNT;

  const setCalendarElement = (key: keyof CalendarAiElements, value: boolean) => {
    setCalendarPreferences((prev) => ({
      ...prev,
      elements: { ...prev.elements, [key]: value },
    }));
  };

  const canGenerate = prompt.trim().length > 0 && !generating;

  const handleSuggestion = (
    suggestion: CalendarAiSuggestion | DesignAiSuggestion | VideoAiSuggestion
  ) => {
    setSelectedSuggestionId(suggestion.id);
    setPrompt(suggestion.prompt);
    if (isVideo && isVideoSuggestion(suggestion)) {
      setVideoPreferences((prev) => ({ ...prev, category: suggestion.category }));
    }
  };

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || generating) return;
    const includeContextValue = {
      propertyPhoto: includeContext.propertyPhoto,
      amenities: includeContext.amenities,
      availability: includeContext.availability,
      orgLogo: includeContext.orgLogo,
      propertyName: includeContext.propertyName,
      cta: includeContext.cta,
    };
    if (isCalendar) {
      const input: Extract<MarketingAiGenerateInput, { preferences: { elements: unknown } }> = {
        prompt: trimmed,
        includeContext: includeContextValue,
        preferences: calendarPreferences,
      };
      await onGenerate(input);
      return;
    }
    if (isVideo) {
      const input: Extract<MarketingAiGenerateInput, { preferences: { duration: unknown } }> = {
        prompt: trimmed,
        includeContext: includeContextValue,
        preferences: videoPreferences,
      };
      await onGenerate(input);
      return;
    }
    const input: Extract<MarketingAiGenerateInput, { preferences: { content: unknown } }> = {
      prompt: trimmed,
      includeContext: includeContextValue,
      preferences: designPreferences,
    };
    await onGenerate(input);
  };

  const title = isCalendar ? 'Generate calendar' : isDesign ? 'Generate design' : 'Generate video';

  const outcomeHint = isCalendar
    ? 'Creates beautiful AI generated calendars you can configure and edit.'
    : isDesign
      ? 'Creates beautiful AI generated designs you can configure and edit.'
      : 'Creates beautiful AI generated video clips you can configure and edit.';

  const showCalendarControls = isCalendar;
  const showDesignControls = isDesign;
  const showVideoControls = isVideo;

  const contextRows = useMemo(() => {
    const order: MarketingAiContextKey[] =
      contentType === 'calendar'
        ? ['propertyPhoto', 'amenities', 'availability']
        : ['propertyPhoto', 'orgLogo', 'propertyName', 'cta'];
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
                : key === 'availability'
                  ? 'Availability'
                  : key === 'orgLogo'
                    ? 'Org logo'
                    : key === 'propertyName'
                      ? 'Property name'
                      : 'Call-to-action',
          available: false,
        }
      );
    });
  }, [contextOptions, contentType]);

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
            {showDesignControls ? (
              <div className="space-y-4">
                <GenerateFieldGroup title="Content">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">Category</Label>
                    <DesignCategoryChips
                      value={designPreferences.category}
                      disabled={generating}
                      onChange={(category) =>
                        setDesignPreferences((prev) => ({ ...prev, category }))
                      }
                    />
                  </div>

                  <CountedTextarea
                    id="marketing-ai-content"
                    label="Content"
                    value={designPreferences.content}
                    onChange={(content) => setDesignPreferences((prev) => ({ ...prev, content }))}
                    rows={3}
                    className="min-h-[88px]"
                    placeholder="Describe what the design should say…"
                    disabled={generating}
                  />

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">Include</Label>
                    <div
                      className="bg-background divide-border/70 divide-y overflow-hidden rounded-xl"
                      role="group"
                      aria-label="Context to include"
                    >
                      {contextRows.map((option) => {
                        const checked = option.available && includeContext[option.key];
                        const switchId = `marketing-ai-context-${option.key}`;
                        const unavailableHint = contextUnavailableHint(option.key);
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
                </GenerateFieldGroup>

                <GenerateFieldGroup title="Look">
                  {suggestions.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-muted-foreground text-xs font-medium">
                          Suggestions
                        </Label>
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
                                  : 'border-border/70 bg-background hover:bg-background/80'
                              )}
                            >
                              {isVideoSuggestion(suggestion) ? (
                                <VideoSuggestionPreview sceneHint={suggestion.sceneHint} />
                              ) : isCalendarSuggestion(suggestion) ? (
                                <SuggestionThemePreview palette={suggestion.palette} />
                              ) : (
                                <DesignSuggestionPreview palette={suggestion.palette} />
                              )}
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
                    </div>
                  ) : null}

                  <CountedTextarea
                    id="marketing-ai-prompt"
                    label="Look"
                    value={prompt}
                    onChange={(next) => {
                      setSelectedSuggestionId(null);
                      setPrompt(next);
                    }}
                    rows={4}
                    className="min-h-[112px]"
                    placeholder="Pick a suggestion or describe the look…"
                    disabled={generating}
                  />

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-muted-foreground text-xs font-medium">Layout</span>
                      <div
                        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                        role="group"
                        aria-label="Layout"
                      >
                        {DESIGN_AI_LAYOUT_OPTIONS.map((option) => (
                          <VisualChoiceButton
                            key={option.value}
                            active={designPreferences.layoutArchetype === option.value}
                            disabled={generating}
                            title={option.label}
                            hint={option.hint}
                            preview={<DesignLayoutOptionPreview option={option} />}
                            onClick={() =>
                              setDesignPreferences((prev) => ({
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
                        {DESIGN_AI_FONT_OPTIONS.map((option) => (
                          <VisualChoiceButton
                            key={option.value}
                            active={designPreferences.fontPairing === option.value}
                            disabled={generating}
                            title={option.label}
                            hint={option.hint}
                            preview={<DesignFontOptionPreview option={option} />}
                            onClick={() =>
                              setDesignPreferences((prev) => ({
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
                        {DESIGN_AI_BACKGROUND_OPTIONS.map((option) => (
                          <VisualChoiceButton
                            key={option.value}
                            active={designPreferences.backgroundMood === option.value}
                            disabled={generating}
                            title={option.label}
                            hint={option.hint}
                            preview={<DesignBackgroundOptionPreview option={option} />}
                            onClick={() =>
                              setDesignPreferences((prev) => ({
                                ...prev,
                                backgroundMood: option.value,
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </GenerateFieldGroup>
              </div>
            ) : showVideoControls ? (
              <div className="space-y-4">
                <GenerateFieldGroup title="Content">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">Category</Label>
                    <VideoCategoryChips
                      value={videoPreferences.category}
                      labels={VIDEO_AI_CATEGORY_LABELS}
                      disabled={generating}
                      onChange={(category) =>
                        setVideoPreferences((prev) => ({
                          ...prev,
                          category: category as VideoAiGeneratePreferences['category'],
                        }))
                      }
                    />
                  </div>

                  <CountedTextarea
                    id="marketing-ai-content"
                    label="Content"
                    value={videoPreferences.content}
                    onChange={(content) => setVideoPreferences((prev) => ({ ...prev, content }))}
                    rows={3}
                    className="min-h-[88px]"
                    placeholder="Describe what the video should say…"
                    disabled={generating}
                  />

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">Include</Label>
                    <div
                      className="bg-background divide-border/70 divide-y overflow-hidden rounded-xl"
                      role="group"
                      aria-label="Context to include"
                    >
                      {contextRows.map((option) => {
                        const checked = option.available && includeContext[option.key];
                        const switchId = `marketing-ai-context-${option.key}`;
                        const unavailableHint = contextUnavailableHint(option.key);
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
                </GenerateFieldGroup>

                <GenerateFieldGroup title="Look">
                  {suggestions.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-muted-foreground text-xs font-medium">
                          Suggestions
                        </Label>
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
                                  : 'border-border/70 bg-background hover:bg-background/80'
                              )}
                            >
                              {isVideoSuggestion(suggestion) ? (
                                <VideoSuggestionPreview sceneHint={suggestion.sceneHint} />
                              ) : null}
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
                    </div>
                  ) : null}

                  <CountedTextarea
                    id="marketing-ai-prompt"
                    label="Look"
                    value={prompt}
                    onChange={(next) => {
                      setSelectedSuggestionId(null);
                      setPrompt(next);
                    }}
                    rows={4}
                    className="min-h-[112px]"
                    placeholder="Pick a suggestion or describe the look…"
                    disabled={generating}
                  />

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-muted-foreground text-xs font-medium">Duration</span>
                      <div
                        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                        role="group"
                        aria-label="Duration"
                      >
                        {VIDEO_AI_DURATION_OPTIONS.map((option) => (
                          <VisualChoiceButton
                            key={option.value}
                            active={videoPreferences.duration === option.value}
                            disabled={generating}
                            title={option.label}
                            hint={option.hint}
                            preview={<VideoDurationOptionPreview option={option} />}
                            onClick={() =>
                              setVideoPreferences((prev) => ({ ...prev, duration: option.value }))
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
                        {VIDEO_AI_FONT_OPTIONS.map((option) => (
                          <VisualChoiceButton
                            key={option.value}
                            active={videoPreferences.fontPairing === option.value}
                            disabled={generating}
                            title={option.label}
                            hint={option.hint}
                            preview={<VideoFontOptionPreview option={option} />}
                            onClick={() =>
                              setVideoPreferences((prev) => ({
                                ...prev,
                                fontPairing: option.value,
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-muted-foreground text-xs font-medium">Motion</span>
                      <div
                        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                        role="group"
                        aria-label="Motion"
                      >
                        {VIDEO_AI_MOTION_OPTIONS.map((option) => (
                          <VisualChoiceButton
                            key={option.value}
                            active={videoPreferences.motionMood === option.value}
                            disabled={generating}
                            title={option.label}
                            hint={option.hint}
                            preview={<VideoMotionOptionPreview option={option} />}
                            onClick={() =>
                              setVideoPreferences((prev) => ({
                                ...prev,
                                motionMood: option.value,
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </GenerateFieldGroup>
              </div>
            ) : (
              <>
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
                            {isVideoSuggestion(suggestion) ? (
                              <VideoSuggestionPreview sceneHint={suggestion.sceneHint} />
                            ) : isCalendarSuggestion(suggestion) ? (
                              <SuggestionThemePreview palette={suggestion.palette} />
                            ) : (
                              <DesignSuggestionPreview palette={suggestion.palette} />
                            )}
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
                            active={calendarPreferences.layoutArchetype === option.value}
                            disabled={generating}
                            title={option.label}
                            hint={option.hint}
                            preview={<LayoutOptionPreview option={option} />}
                            onClick={() =>
                              setCalendarPreferences((prev) => ({
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
                            active={calendarPreferences.fontPairing === option.value}
                            disabled={generating}
                            title={option.label}
                            hint={option.hint}
                            preview={<FontOptionPreview option={option} />}
                            onClick={() =>
                              setCalendarPreferences((prev) => ({
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
                            active={calendarPreferences.backgroundMood === option.value}
                            disabled={generating}
                            title={option.label}
                            hint={option.hint}
                            preview={<BackgroundOptionPreview option={option} />}
                            onClick={() =>
                              setCalendarPreferences((prev) => ({
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
                      <span>
                        {advancedOpen ? 'Hide advanced settings' : 'Show advanced settings'}
                      </span>
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
                        <p className="text-muted-foreground text-xs font-medium">
                          Show on calendar
                        </p>
                        <div
                          className="divide-border/70 border-border/70 divide-y rounded-xl border"
                          role="group"
                          aria-label="Show on calendar"
                        >
                          {CALENDAR_AI_ELEMENT_OPTIONS.map((option) => {
                            const checked = calendarPreferences.elements[option.key];
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
                                  onCheckedChange={(value) => setCalendarElement(option.key, value)}
                                  aria-label={option.label}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-muted-foreground text-xs font-medium">
                          Use when generating
                        </p>
                        <div
                          className="divide-border/70 border-border/70 divide-y rounded-xl border"
                          role="group"
                          aria-label="Use when generating"
                        >
                          {contextRows.map((option) => {
                            const checked = option.available && includeContext[option.key];
                            const switchId = `calendar-ai-context-${option.key}`;
                            const unavailableHint = contextUnavailableHint(option.key);
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
                        const unavailableHint = contextUnavailableHint(option.key);
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
                  </section>
                )}
              </>
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
