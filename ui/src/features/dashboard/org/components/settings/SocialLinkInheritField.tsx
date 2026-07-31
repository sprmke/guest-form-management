import { ExternalLink, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { RequiredMark } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FORM_PLACEHOLDERS } from '@/lib/constants/formPlaceholders';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  label: string;
  required?: boolean;
  storedValue: string;
  orgValue: string;
  orgName: string;
  orgSettingsHref: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
  onStoredChange: (value: string) => void;
  onInteract: () => void;
};

const PLACEHOLDER_BY_LABEL: Record<string, string> = {
  Facebook: FORM_PLACEHOLDERS.facebookPage,
  Airbnb: FORM_PLACEHOLDERS.airbnbListing,
  Instagram: FORM_PLACEHOLDERS.instagramProfile,
  TikTok: FORM_PLACEHOLDERS.tiktokProfile,
};

export function SocialLinkInheritField({
  id,
  label,
  required,
  storedValue,
  orgValue,
  orgName,
  orgSettingsHref,
  placeholder,
  disabled,
  error,
  onStoredChange,
  onInteract,
}: Props) {
  const inherits = storedValue.trim() === '';
  const resolvedPlaceholder = placeholder ?? PLACEHOLDER_BY_LABEL[label] ?? 'https://';
  const displayValue = inherits ? orgValue : storedValue;
  const switchId = `${id}-inherit`;

  const handleInheritChange = (nextInherits: boolean) => {
    onInteract();
    if (nextInherits) {
      onStoredChange('');
      return;
    }
    onStoredChange(orgValue.trim());
  };

  return (
    <div className="bg-card flex flex-col gap-2 p-3 sm:grid sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:items-start sm:gap-4">
      <Label
        htmlFor={inherits ? undefined : id}
        className="text-sm font-medium leading-none sm:pt-2.5"
      >
        {label}
        {required ? <RequiredMark /> : null}
      </Label>

      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          {inherits ? (
            <Link
              to={orgSettingsHref}
              className="text-muted-foreground hover:text-foreground inline-flex min-h-[44px] min-w-0 items-center gap-1.5 text-xs transition-colors"
            >
              <Link2 className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{orgName}</span>
              <ExternalLink className="size-3 shrink-0 opacity-70" aria-hidden />
            </Link>
          ) : (
            <span className="text-muted-foreground text-xs">Custom link</span>
          )}

          <div className="flex shrink-0 items-center gap-2">
            <Label htmlFor={switchId} className="text-muted-foreground sr-only">
              Use organization {label} link
            </Label>
            <span className="text-muted-foreground hidden text-xs sm:inline">
              {inherits ? 'Organization' : 'Custom'}
            </span>
            <div className="flex min-h-[44px] min-w-[44px] items-center justify-center">
              <Switch
                id={switchId}
                checked={inherits}
                disabled={disabled}
                aria-label={`Use organization ${label} link`}
                onCheckedChange={handleInheritChange}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-1">
          <Input
            id={id}
            type="url"
            disabled={disabled || inherits}
            readOnly={inherits}
            value={displayValue}
            onChange={(event) => {
              onInteract();
              onStoredChange(event.target.value);
            }}
            className={cn(
              'h-10 min-w-0',
              inherits && 'bg-muted/40 text-muted-foreground cursor-default',
              error && 'border-destructive'
            )}
            placeholder={inherits ? resolvedPlaceholder : resolvedPlaceholder}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-readonly={inherits}
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
