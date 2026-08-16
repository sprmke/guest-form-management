import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FORM_PLACEHOLDERS } from '@/lib/constants/formPlaceholders';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  label: string;
  storedValue: string;
  orgValue: string;
  inheritsOrg: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
  onStoredChange: (value: string) => void;
  onInheritsOrgChange: (inherits: boolean) => void;
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
  storedValue,
  orgValue,
  inheritsOrg,
  placeholder,
  disabled,
  error,
  onStoredChange,
  onInheritsOrgChange,
  onInteract,
}: Props) {
  const resolvedPlaceholder = placeholder ?? PLACEHOLDER_BY_LABEL[label] ?? 'https://';
  const displayValue = inheritsOrg ? orgValue : storedValue;

  return (
    <div className="bg-card flex flex-col gap-2 p-3 sm:grid sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:items-start sm:gap-4">
      <Label htmlFor={id} className="text-sm font-medium leading-none sm:pt-2.5">
        {label}
      </Label>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            id={id}
            type="text"
            inputMode="url"
            disabled={disabled || inheritsOrg}
            readOnly={inheritsOrg}
            value={displayValue}
            onChange={(event) => {
              onInteract();
              onStoredChange(event.target.value);
            }}
            className={cn(
              'h-10 min-w-0 flex-1',
              inheritsOrg && 'bg-muted/40 text-muted-foreground',
              error && 'border-destructive'
            )}
            placeholder={resolvedPlaceholder}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-readonly={inheritsOrg}
          />
          {inheritsOrg ? (
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="min-h-[44px] shrink-0"
              onClick={() => {
                onInteract();
                onInheritsOrgChange(false);
                onStoredChange(orgValue.trim());
              }}
            >
              Customize link
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="min-h-[44px] shrink-0"
              onClick={() => {
                onInteract();
                onInheritsOrgChange(true);
                onStoredChange('');
              }}
            >
              Use org link
            </Button>
          )}
        </div>

        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </div>
  );
}
