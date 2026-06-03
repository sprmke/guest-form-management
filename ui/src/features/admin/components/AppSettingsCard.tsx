import * as React from 'react';
import { Check, ChevronDown, Globe, Mail, Settings, Shield, Timer, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { AppSettingsCardSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  appSettingsToFormValues,
  useAppSettings,
  useUpdateAppSettings,
  type AppSettingsFieldSource,
  type AppSettingsFormValues,
  type AppSettingsSecretsStatus,
  SD_REFUND_CRON_EMAIL_LEAD_MAX_HOURS,
} from '@/features/admin/hooks/useAppSettings';

function CollapsibleSection({
  id,
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="rounded-lg border group border-border bg-muted/15"
    >
      <CollapsibleTrigger
        type="button"
        className={cn(
          'flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left',
          'text-foreground hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-controls={`${id}-panel`}
      >
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span className="flex-1 min-w-0 text-sm font-semibold">{title}</span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          id={`${id}-panel`}
          className="px-3 pt-3 pb-4 space-y-4 border-t border-separator"
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function FieldGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

function FieldSpan({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 lg:col-span-2">{children}</div>;
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  source?: AppSettingsFieldSource;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {hint ? (
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}

function SecretBadge({
  label,
  configured,
}: {
  label: string;
  configured: boolean;
}) {
  return (
    <div
      className={cn(
        'flex gap-2 justify-between items-center px-3 py-2 rounded-lg border min-h-[44px]',
        configured
          ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'border-amber-200 bg-amber-50/60 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
      )}
    >
      <span className="text-sm">{label}</span>
      {configured ? (
        <Check
          className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400"
          aria-label="Configured"
        />
      ) : (
        <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
          Not set
        </span>
      )}
    </div>
  );
}

function SecretGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-separator bg-muted/10 p-3 space-y-2.5">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function SecretsPanel({ status }: { status: AppSettingsSecretsStatus }) {
  return (
    <div className="space-y-3">
      <SecretGroup title="Email">
        <SecretBadge
          label="Email (Resend)"
          configured={status.resendApiKeyConfigured}
        />
      </SecretGroup>

      <SecretGroup title="Google">
        <SecretBadge
          label="Google account"
          configured={status.googleServiceAccountConfigured}
        />
        <SecretBadge
          label="Calendar"
          configured={status.googleCalendarIdConfigured}
        />
        <SecretBadge
          label="Spreadsheet"
          configured={status.googleSpreadsheetIdConfigured}
        />
        <SecretBadge
          label="Gmail security key"
          configured={status.gmailEncryptionKeyConfigured}
        />
        <SecretBadge
          label="Gmail app login"
          configured={status.gmailWebClientConfigured}
        />
      </SecretGroup>

      <SecretGroup title="Telegram">
        <SecretBadge
          label="Telegram bot"
          configured={status.telegramBotTokenConfigured}
        />
        <SecretBadge
          label="Marketing group"
          configured={status.telegramChatIdConfigured}
        />
        <SecretBadge
          label="Staff group"
          configured={status.telegramStaffChatIdConfigured}
        />
        <SecretBadge
          label="Operations group"
          configured={status.telegramAdminChatIdConfigured}
        />
      </SecretGroup>
    </div>
  );
}

export function AppSettingsCard() {
  const { data, isLoading, isError, error } = useAppSettings();
  const update = useUpdateAppSettings();
  const [draft, setDraft] = React.useState<AppSettingsFormValues | null>(null);

  React.useEffect(() => {
    if (data) setDraft(appSettingsToFormValues(data));
  }, [data]);

  const busy = isLoading || update.isPending;
  const sources = data?.fieldSources;

  const set = <K extends keyof AppSettingsFormValues>(
    key: K,
    value: AppSettingsFormValues[K],
  ) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = () => {
    if (!draft) return;
    update.mutate(draft, {
      onSuccess: () => toast.success('Settings saved'),
      onError: (e) => toast.error((e as Error).message),
    });
  };

  if (isLoading) {
    return <AppSettingsCardSkeleton />;
  }

  return (
    <section
      className={cn(
        'surface-card w-full px-3 py-3 sm:px-4 sm:py-4',
        'space-y-4 shadow-sm',
      )}
      aria-labelledby="app-settings-heading"
    >
      <AdminPageHeader
        id="app-settings-heading"
        title="Settings"
        subtitle="Integrations, credentials, and workspace configuration."
        icon={Settings}
      />

      {isError && (
        <p className="text-sm text-destructive">
          {(error as Error)?.message ?? 'Could not load settings'}
        </p>
      )}

      {draft && data && (
        <div className="space-y-3">
          <CollapsibleSection
            id="email-routing"
            title="Email"
            icon={<Mail className="size-4" aria-hidden />}
          >
            <FieldGrid>
              <Field
                id="email-to"
                label="Documents Approver Email"
                hint="Email address that receives GAF and Pet approval requests."
                source={sources?.emailTo}
              >
                <Input
                  id="email-to"
                  type="email"
                  autoComplete="off"
                  disabled={busy}
                  value={draft.emailTo}
                  onChange={(e) => set('emailTo', e.target.value)}
                  className="h-10"
                />
              </Field>
              <Field
                id="email-reply-to"
                label="Team Email"
                hint="Reply-to for guest emails. Gmail only accepts GAF/pet approval replies from this sender when set."
                source={sources?.emailReplyTo}
              >
                <Input
                  id="email-reply-to"
                  type="email"
                  autoComplete="off"
                  disabled={busy}
                  value={draft.emailReplyTo}
                  onChange={(e) => set('emailReplyTo', e.target.value)}
                  className="h-10"
                />
              </Field>
              <FieldSpan>
                <Field
                  id="parking-owner-emails"
                  label="Parking Owners"
                  hint="Comma separated email list of parking owners."
                  source={sources?.parkingOwnerEmails}
                >
                  <Input
                    id="parking-owner-emails"
                    disabled={busy}
                    value={draft.parkingOwnerEmails}
                    onChange={(e) => set('parkingOwnerEmails', e.target.value)}
                    className="h-10"
                  />
                </Field>
              </FieldSpan>
            </FieldGrid>
          </CollapsibleSection>

          <CollapsibleSection
            id="automation"
            title="Automation"
            icon={<Timer className="size-4" aria-hidden />}
            defaultOpen={false}
          >
            <FieldGrid>
              <Field
                id="sd-lead-hours"
                label="SD Refund Email Lead (hours)"
                hint="How many hours before checkout the guest gets the SD refund email."
                source={sources?.sdRefundCronEmailLeadMinutes}
              >
                <Input
                  id="sd-lead-hours"
                  type="number"
                  min={0}
                  max={SD_REFUND_CRON_EMAIL_LEAD_MAX_HOURS}
                  step={0.5}
                  disabled={busy}
                  value={draft.sdRefundCronEmailLeadHours}
                  onChange={(e) =>
                    set(
                      'sdRefundCronEmailLeadHours',
                      Number(e.target.value) || 0,
                    )
                  }
                  className="h-10"
                />
              </Field>
              <Field
                id="sd-max-age"
                label="Skip Old Checkouts After (days)"
                hint="Skip the automated SD email if checkout was longer ago than this. Use 0 to always send."
                source={sources?.sdRefundCronMaxCheckoutAgeDays}
              >
                <Input
                  id="sd-max-age"
                  type="number"
                  min={0}
                  max={365}
                  disabled={busy}
                  value={draft.sdRefundCronMaxCheckoutAgeDays}
                  onChange={(e) =>
                    set(
                      'sdRefundCronMaxCheckoutAgeDays',
                      Number(e.target.value) || 0,
                    )
                  }
                  className="h-10"
                />
              </Field>
              <Field
                id="default-parking-rate"
                label="Default Parking Rate (₱)"
                hint="Default parking rate for guests."
                source={sources?.defaultParkingRateGuest}
              >
                <Input
                  id="default-parking-rate"
                  type="number"
                  min={1}
                  step={1}
                  disabled={busy}
                  value={draft.defaultParkingRateGuest}
                  onChange={(e) =>
                    set('defaultParkingRateGuest', Number(e.target.value) || 0)
                  }
                  className="h-10"
                />
              </Field>
            </FieldGrid>
          </CollapsibleSection>

          <CollapsibleSection
            id="payment"
            title="Payment"
            icon={<Wallet className="size-4" aria-hidden />}
            defaultOpen={false}
          >
            <FieldGrid>
              <Field
                id="gcash-name"
                label="GCash Name"
                hint="Account name shown on the guest form Payment step."
                source={sources?.gcashName}
              >
                <Input
                  id="gcash-name"
                  autoComplete="off"
                  disabled={busy}
                  value={draft.gcashName}
                  onChange={(e) => set('gcashName', e.target.value)}
                  className="h-10"
                  placeholder="Arianna Perez"
                />
              </Field>
              <Field
                id="gcash-number"
                label="GCash Number"
                hint="Mobile number shown beside the GCash QR code on the guest form."
                source={sources?.gcashNumber}
              >
                <Input
                  id="gcash-number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  disabled={busy}
                  value={draft.gcashNumber}
                  onChange={(e) => set('gcashNumber', e.target.value)}
                  className="h-10"
                  placeholder="0962 564 7541"
                />
              </Field>
            </FieldGrid>
          </CollapsibleSection>

          <CollapsibleSection
            id="guest-links"
            title="Links & Branding"
            icon={<Globe className="size-4" aria-hidden />}
            defaultOpen={false}
          >
            <FieldGrid>
              <Field
                id="public-guest-origin"
                label="Website URL"
                hint="Base link that will be used across the app."
                source={sources?.publicGuestAppOrigin}
              >
                <Input
                  id="public-guest-origin"
                  type="url"
                  disabled={busy}
                  value={draft.publicGuestAppOrigin}
                  onChange={(e) => set('publicGuestAppOrigin', e.target.value)}
                  className="h-10"
                  placeholder="https://kamehomes.space"
                />
              </Field>
              <Field
                id="facebook-reviews-url"
                label="Facebook Reviews"
                hint="Link shown when guests leave a review during SD refund."
                source={sources?.facebookReviewsUrl}
              >
                <Input
                  id="facebook-reviews-url"
                  type="url"
                  disabled={busy}
                  value={draft.facebookReviewsUrl}
                  onChange={(e) => set('facebookReviewsUrl', e.target.value)}
                  className="h-10"
                />
              </Field>
              <FieldSpan>
                <Field
                  id="email-logo-url"
                  label="Team Logo"
                  hint="Logo image used across the app."
                  source={sources?.emailLogoUrl}
                >
                  <Input
                    id="email-logo-url"
                    type="url"
                    disabled={busy}
                    value={draft.emailLogoUrl}
                    onChange={(e) => set('emailLogoUrl', e.target.value)}
                    className="h-10"
                  />
                </Field>
              </FieldSpan>
            </FieldGrid>
          </CollapsibleSection>

          <CollapsibleSection
            id="env-secrets"
            title="Integrations"
            icon={<Shield className="size-4" aria-hidden />}
            defaultOpen={false}
          >
            <p className="text-xs leading-snug text-muted-foreground">
              Sensitive information health check.
            </p>
            <SecretsPanel status={data.secretsStatus} />
          </CollapsibleSection>
        </div>
      )}

      {!isError ? (
        <div className="flex flex-col gap-2 border-t border-separator pt-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            disabled={busy || !draft}
            onClick={handleSave}
            className="min-h-[44px] w-full sm:w-auto"
          >
            {update.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
