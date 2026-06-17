import * as React from 'react';
import { Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  applyTelegramPlaceholders,
  renderTelegramPlaceholderHighlights,
} from '@/features/admin/lib/telegramTemplatePreview';
import {
  getTelegramPreviewSamples,
  type TelegramPreviewSampleSet,
} from '@/features/admin/lib/telegramPreviewSamples';
import { useTelegramTemplateLivePreview } from '@/features/admin/hooks/useTelegramTemplateLivePreview';
import type { TelegramPreviewContext } from '@/features/admin/lib/telegramDraftPreviewApi';

type EditorTab = 'edit' | 'preview';

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onSendDraft?: () => void;
  sendPreviewTitle?: string;
  previewSampleSet?: TelegramPreviewSampleSet;
  previewContext?: TelegramPreviewContext;
  /** When set, only `{{key}}` tokens in this set are highlighted in edit mode. */
  validPlaceholderKeys?: ReadonlySet<string>;
  rows?: number;
  minHeightClassName?: string;
  mono?: boolean;
  className?: string;
  labelClassName?: string;
};

function editTextLayerClass(mono?: boolean) {
  return cn(
    'whitespace-pre-wrap break-words px-4 py-3 text-sm font-medium leading-[1.5] sm:text-[13px]',
    mono && 'font-mono',
  );
}

export function TelegramTemplateEditor({
  id,
  label,
  value,
  onChange,
  disabled,
  onSendDraft,
  sendPreviewTitle = 'Send test with live data.',
  previewSampleSet,
  previewContext,
  validPlaceholderKeys,
  rows = 3,
  minHeightClassName = 'min-h-[88px]',
  mono,
  className,
  labelClassName,
}: Props) {
  const [tab, setTab] = React.useState<EditorTab>('edit');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const backdropRef = React.useRef<HTMLDivElement>(null);
  const inputId = `${id}-textarea`;
  const previewId = `${id}-preview`;

  const resolvedValidKeys = React.useMemo(() => {
    if (validPlaceholderKeys && validPlaceholderKeys.size > 0) {
      return validPlaceholderKeys;
    }
    if (previewSampleSet) {
      return new Set(Object.keys(getTelegramPreviewSamples(previewSampleSet)));
    }
    return undefined;
  }, [validPlaceholderKeys, previewSampleSet]);

  const livePreview = useTelegramTemplateLivePreview(
    value,
    previewContext,
    tab === 'preview',
  );

  const contentClassName = cn(
    'min-w-0 w-full resize-y text-sm font-medium leading-[1.5] sm:text-[13px]',
    minHeightClassName,
    mono && 'font-mono',
  );

  const samplePreviewText = React.useMemo(() => {
    if (!previewSampleSet || !value.trim()) return value;
    return applyTelegramPlaceholders(
      value,
      getTelegramPreviewSamples(previewSampleSet),
    );
  }, [previewSampleSet, value]);

  const useLivePreview =
    tab === 'preview' &&
    !!previewContext &&
    !!value.trim() &&
    livePreview.isSuccess &&
    !!livePreview.data?.renderedText;

  const previewText = useLivePreview
    ? livePreview.data!.renderedText
    : samplePreviewText;

  const previewFooter = React.useMemo(() => {
    if (tab !== 'preview' || !value.trim()) return null;
    if (livePreview.isLoading && previewContext) {
      return 'Loading live preview…';
    }
    if (useLivePreview) {
      return 'Live preview';
    }
    if (livePreview.isError && previewContext && previewSampleSet) {
      return `Sample data — live preview unavailable (${(livePreview.error as Error).message})`;
    }
    if (livePreview.isError && previewContext) {
      return (livePreview.error as Error).message;
    }
    if (previewSampleSet) {
      return 'Sample data';
    }
    return null;
  }, [
    tab,
    value,
    livePreview.isLoading,
    livePreview.isError,
    livePreview.error,
    previewContext,
    previewSampleSet,
    useLivePreview,
  ]);

  const syncBackdropScroll = React.useCallback(() => {
    const textarea = textareaRef.current;
    const backdrop = backdropRef.current;
    if (!textarea || !backdrop) return;
    backdrop.scrollTop = textarea.scrollTop;
    backdrop.scrollLeft = textarea.scrollLeft;
  }, []);

  React.useLayoutEffect(() => {
    if (tab === 'edit') syncBackdropScroll();
  }, [tab, value, syncBackdropScroll]);

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2 rounded-lg border border-border/80 bg-background/80 p-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-3 sm:gap-y-2 sm:items-start sm:p-3',
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:col-start-1 sm:row-start-1 sm:self-center">
        <Label
          htmlFor={tab === 'edit' ? inputId : previewId}
          className={cn(
            'min-w-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]',
            labelClassName,
          )}
        >
          {label}
        </Label>
        <div
          role="group"
          aria-label={`${label} view`}
          className="inline-flex shrink-0 items-center rounded-lg border border-border/70 bg-muted/40 p-0.5"
        >
          {(
            [
              { value: 'edit' as const, label: 'Edit', Icon: Pencil },
              { value: 'preview' as const, label: 'Preview', Icon: Eye },
            ] as const
          ).map(({ value: tabValue, label: tabLabel, Icon }) => {
            const active = tab === tabValue;
            return (
              <button
                key={tabValue}
                type="button"
                disabled={disabled}
                onClick={() => setTab(tabValue)}
                aria-pressed={active}
                className={cn(
                  'inline-flex min-h-8 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors',
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3 shrink-0" aria-hidden />
                <span>{tabLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {onSendDraft ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="min-h-[44px] w-full min-w-0 sm:col-start-2 sm:row-start-1 sm:h-9 sm:w-auto sm:min-h-9 sm:shrink-0 sm:justify-self-end sm:self-center"
          title={sendPreviewTitle}
          onClick={() => onSendDraft()}
        >
          Send preview
        </Button>
      ) : null}

      <div className="col-span-full min-w-0 sm:col-span-2 sm:row-start-2">
        {tab === 'edit' ? (
          <div
            className={cn(
              'relative overflow-hidden rounded-lg border border-border/70 bg-card shadow-[inset_0_1px_2px_hsl(240_6%_10%_/0.04)] dark:border-border/50 dark:bg-muted/40 dark:shadow-none',
              minHeightClassName,
              'min-w-0 w-full',
            )}
          >
            <div
              ref={backdropRef}
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 overflow-hidden text-foreground',
                editTextLayerClass(mono),
              )}
            >
              {value
                ? renderTelegramPlaceholderHighlights(
                    value,
                    `${id}-edit-`,
                    'edit',
                    resolvedValidKeys,
                  )
                : null}
            </div>
            <textarea
              ref={textareaRef}
              id={inputId}
              disabled={disabled}
              rows={rows}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="Type your message. Use {{placeholder}} tokens."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onInput={syncBackdropScroll}
              onScroll={syncBackdropScroll}
              style={{ WebkitTextFillColor: 'transparent' }}
              className={cn(
                'relative z-[1] block w-full resize-y border-0 bg-transparent text-transparent caret-foreground outline-none selection:bg-primary/20 selection:text-transparent focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50',
                editTextLayerClass(mono),
              )}
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <div
              id={previewId}
              role="region"
              aria-label={`${label} preview`}
              aria-busy={livePreview.isLoading && !!previewContext}
              className={cn(
                'rounded-lg border border-border/70 bg-card px-4 py-3 text-sm font-medium text-foreground shadow-[inset_0_1px_2px_hsl(240_6%_10%_/0.04)] dark:border-border/50 dark:bg-muted/40 dark:shadow-none',
                contentClassName,
                'resize-y overflow-auto whitespace-pre-wrap',
              )}
            >
              {!value.trim() ? (
                <span className="text-muted-foreground">
                  Nothing to preview yet.
                </span>
              ) : livePreview.isLoading && previewContext ? (
                <div className="space-y-2 py-1" aria-hidden>
                  <Skeleton className="h-3.5 w-[92%]" />
                  <Skeleton className="h-3.5 w-[78%]" />
                  <Skeleton className="h-3.5 w-[85%]" />
                  <Skeleton className="h-3.5 w-[60%]" />
                </div>
              ) : (
                renderTelegramPlaceholderHighlights(
                  previewText,
                  `${id}-preview-`,
                  'preview',
                  resolvedValidKeys,
                )
              )}
            </div>
            {previewFooter ? (
              <p
                className={cn(
                  'text-caption text-xs text-muted-foreground',
                  livePreview.isError &&
                    previewContext &&
                    !previewSampleSet &&
                    'text-destructive',
                )}
              >
                {previewFooter}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
