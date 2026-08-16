import * as React from 'react';

import {
  TelegramHelpDialog,
  type TelegramHelpTab,
} from '@/features/dashboard/bookings/components/telegram-notifications/TelegramHelpDialog';
import { SETTINGS_FIELD_LABEL_COMPACT } from '@/features/dashboard/org/lib/settingsFieldLabel';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type TelegramSecretInputProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  helpTab?: TelegramHelpTab;
  /** Friendly label when hidden (e.g. @mybot, group title). */
  maskedLabel?: string;
  /** Show skeleton while resolving maskedLabel. */
  labelLoading?: boolean;
  /** Optional action shown beside Reveal/Hide (e.g. Rescan). */
  secondaryAction?: {
    label: string;
    ariaLabel?: string;
    onClick: () => void;
  };
  /** Unsaved edits — show raw value and a Save action instead of Reveal/Hide. */
  dirty?: boolean;
  /** Async commit in progress (Save / validate). */
  commitPending?: boolean;
  onCommit?: () => void;
  onChange: (value: string) => void;
  className?: string;
};

export function TelegramSecretInput({
  id,
  label,
  value,
  placeholder,
  disabled,
  helpTab,
  maskedLabel,
  labelLoading = false,
  secondaryAction,
  dirty = false,
  commitPending = false,
  onCommit,
  onChange,
  className,
}: TelegramSecretInputProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!dirty) setVisible(false);
  }, [dirty]);

  const hasValue = value.trim().length > 0;
  const editing = dirty;
  const hidden = hasValue && !visible && !editing;
  const showSkeleton = commitPending || (hidden && !maskedLabel && labelLoading && !editing);
  const showFriendlyLabel = hidden && Boolean(maskedLabel);
  const displayValue = showFriendlyLabel ? maskedLabel! : hidden ? '' : value;
  const toggleLabel = visible ? 'Hide' : maskedLabel ? 'Reveal' : 'Show';
  const showActions = hasValue && !showSkeleton;
  const showSave = editing && Boolean(onCommit);
  const showSecondary = Boolean(secondaryAction && !showSave && visible);
  const inputPadding =
    showActions && showSecondary ? 'pr-[8.75rem]' : showActions ? 'pr-[3.5rem]' : undefined;

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <div className="flex items-center gap-0.5">
        <Label htmlFor={id} className={SETTINGS_FIELD_LABEL_COMPACT}>
          {label}
        </Label>
        {helpTab ? <TelegramHelpDialog defaultTab={helpTab} variant="icon" /> : null}
      </div>
      <div className="relative">
        {showSkeleton ? (
          <div
            className={cn(
              'border-input bg-background flex h-10 w-full items-center rounded-lg border px-3',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            aria-hidden
          >
            <Skeleton className="h-4 w-[min(100%,11rem)]" />
          </div>
        ) : (
          <Input
            id={id}
            type="text"
            autoComplete="off"
            value={displayValue}
            readOnly={showFriendlyLabel}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => {
              if (showFriendlyLabel) return;
              onChange(e.target.value);
            }}
            className={cn(
              'h-10',
              inputPadding,
              showFriendlyLabel && 'text-foreground cursor-default'
            )}
          />
        )}
        {showActions ? (
          <div className="absolute right-0 top-0 flex h-10 items-center">
            {showSecondary ? (
              <button
                type="button"
                disabled={disabled}
                aria-label={secondaryAction!.ariaLabel ?? secondaryAction!.label}
                onClick={secondaryAction!.onClick}
                className="text-muted-foreground hover:text-foreground flex h-10 min-w-[44px] items-center justify-center px-2 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                {secondaryAction!.label}
              </button>
            ) : null}
            {showSave ? (
              <button
                type="button"
                disabled={disabled || commitPending}
                aria-label={`Save ${label}`}
                onClick={onCommit}
                className="text-muted-foreground hover:text-foreground flex h-10 min-w-[44px] items-center justify-center rounded-r-lg px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                Save
              </button>
            ) : (
              <button
                type="button"
                disabled={disabled}
                aria-label={visible ? `Hide ${label}` : `Show ${label}`}
                onClick={() => setVisible((v) => !v)}
                className="text-muted-foreground hover:text-foreground flex h-10 min-w-[44px] items-center justify-center rounded-r-lg px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                {toggleLabel}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
