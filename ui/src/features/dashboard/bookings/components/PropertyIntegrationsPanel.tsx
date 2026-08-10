import type { ComponentType } from 'react';
import { useState } from 'react';

import { Link } from 'react-router-dom';

import { Check, ChevronRight, Mail } from 'lucide-react';

import { AiIntegrationCard } from '@/features/dashboard/bookings/components/AiIntegrationCard';
import { GmailMailIntegrationCard } from '@/features/dashboard/bookings/components/GmailMailIntegrationCard';
import { IntegrationSourceBadge } from '@/features/dashboard/bookings/components/IntegrationSourceBadge';
import type {
  PropertyIntegrationStatus,
  PropertyTelegramCredentialsStatus,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import { useGmailMailIntegrationStatus } from '@/features/dashboard/bookings/hooks/useGmailMailIntegration';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { propertyNotificationsPath } from '@/features/dashboard/org/lib/tenantPaths';

import { GoogleMark } from '@/components/branding/GoogleMark';
import { TelegramMark } from '@/components/branding/TelegramMark';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { toneIconWrapClasses } from '@/lib/statusToneColors';
import { cn } from '@/lib/utils';

type TelegramChannel = {
  id: 'marketing' | 'staff' | 'operations' | 'finance' | 'maintenance' | 'parking' | 'chat';
  label: string;
  status: PropertyTelegramCredentialsStatus;
};

function GoogleServiceRow({
  icon: Icon,
  label,
  configured,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  configured: boolean;
  detail?: string | null;
}) {
  return (
    <div className="border-border/60 bg-background/80 flex min-h-[44px] items-center gap-3 rounded-lg border px-3 py-2.5">
      <div
        className={cn(
          'size-9 shrink-0',
          configured
            ? toneIconWrapClasses('green')
            : 'bg-muted text-muted-foreground flex items-center justify-center rounded-lg'
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {detail ? <p className="text-muted-foreground truncate text-xs">{detail}</p> : null}
      </div>
      {configured ? (
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center',
            toneIconWrapClasses('green', 'rounded-full')
          )}
          aria-label="Connected"
          title="Connected"
        >
          <Check className="size-4 stroke-[2.5]" aria-hidden />
        </span>
      ) : (
        <span
          className="text-muted-foreground flex size-9 shrink-0 items-center justify-center"
          aria-label="Not configured"
          title="Not configured"
        >
          <span className="text-sm" aria-hidden>
            —
          </span>
        </span>
      )}
    </div>
  );
}

function isTelegramChannelConnected(status: PropertyTelegramCredentialsStatus): boolean {
  return status.tokenConfigured && status.chatIdConfigured;
}

function telegramAggregateStatus(channels: TelegramChannel[]): {
  connectedCount: number;
  total: number;
  label: string;
  tone: 'connected' | 'partial' | 'none';
} {
  const total = channels.length;
  const connectedCount = channels.filter((channel) =>
    isTelegramChannelConnected(channel.status)
  ).length;

  if (connectedCount === total) {
    return {
      connectedCount,
      total,
      label: `${connectedCount} channels connected`,
      tone: 'connected',
    };
  }

  if (connectedCount === 0) {
    return {
      connectedCount,
      total,
      label: 'Not configured',
      tone: 'none',
    };
  }

  return {
    connectedCount,
    total,
    label: `${connectedCount} of ${total} channels configured`,
    tone: 'partial',
  };
}

function TelegramChannelCard({
  label,
  href,
  status,
}: {
  label: string;
  href: string;
  status: PropertyTelegramCredentialsStatus;
}) {
  return (
    <div className="border-border/60 bg-background/80 flex min-h-[7.5rem] flex-col justify-center space-y-3 rounded-xl border p-5 sm:min-h-[8.5rem] sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-medium">{label}</span>
        <Link
          to={href}
          className="text-primary inline-flex min-h-[44px] shrink-0 items-center gap-0.5 text-sm font-medium"
        >
          Configure
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2.5">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
          Bot
          <IntegrationSourceBadge source={status.tokenSource} configured={status.tokenConfigured} />
        </span>
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
          Chat
          <IntegrationSourceBadge
            source={status.chatIdSource}
            configured={status.chatIdConfigured}
          />
        </span>
      </div>
    </div>
  );
}

function TelegramIntegrationBlock({
  channels,
  notificationsPath,
}: {
  channels: TelegramChannel[];
  notificationsPath: (module: TelegramChannel['id']) => string;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const aggregate = telegramAggregateStatus(channels);

  return (
    <>
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="border-border bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border sm:size-11">
                <TelegramMark className="size-5 sm:size-[22px]" />
              </div>
              <div className="min-w-0">
                <h3
                  id="telegram-integration-heading"
                  className="text-sidebar-foreground text-sm font-bold sm:text-[13px]"
                >
                  Telegram
                </h3>
                <p
                  className={cn(
                    'mt-1.5 text-xs sm:text-[11px]',
                    aggregate.tone === 'connected'
                      ? 'font-medium text-emerald-800 dark:text-emerald-300'
                      : 'text-amber-800/90 dark:text-amber-200'
                  )}
                >
                  {aggregate.label}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className={cn(
                'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4',
                'border-primary/30 bg-primary/5 text-primary border text-sm font-semibold sm:w-auto sm:text-[13px]',
                'hover:border-primary/40 hover:bg-primary/10 transition-colors'
              )}
            >
              Manage
            </button>
          </div>
        </div>
      </div>

      <ResponsiveModal open={manageOpen} onOpenChange={setManageOpen}>
        <ResponsiveModalContent className="max-h-[min(90dvh,820px)] max-w-[min(calc(100vw-1.5rem),48rem)] gap-5 overflow-y-auto sm:max-w-[min(90vw,48rem)] sm:p-8">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Telegram</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {channels.map((channel) => (
              <TelegramChannelCard
                key={channel.id}
                label={channel.label}
                href={notificationsPath(channel.id)}
                status={channel.status}
              />
            ))}
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}

function GoogleIntegrationBlock({
  status,
  hideOAuth,
}: {
  status: PropertyIntegrationStatus;
  hideOAuth?: boolean;
}) {
  const { data } = useGmailMailIntegrationStatus();
  const connected = hideOAuth
    ? status.gmail.connected
    : Boolean(data?.connected && !data?.needsReconnect);

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="p-4">
        {hideOAuth ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="border-border bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border sm:size-11">
                <GoogleMark className="size-5 sm:size-[22px]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sidebar-foreground text-sm font-bold sm:text-[13px]">Google</h3>
                <p
                  className={cn(
                    'mt-1.5 text-xs sm:text-[11px]',
                    connected
                      ? 'font-medium text-emerald-800 dark:text-emerald-300'
                      : 'text-amber-800/90 dark:text-amber-200'
                  )}
                >
                  {connected ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <GmailMailIntegrationCard variant="nested" />
        )}
      </div>
      {connected ? (
        <div className="border-border/60 bg-muted/10 space-y-2 border-t px-4 py-3">
          <GoogleServiceRow
            icon={Mail}
            label="Gmail inbox"
            configured={status.gmail.connected}
            detail={status.gmail.googleAccountEmail}
          />
        </div>
      ) : null}
    </div>
  );
}

export function PropertyIntegrationsPanel({
  status,
  aiKeys,
  notificationsPath,
  hideGoogleOAuth = false,
  telegramLayout = 'property',
}: {
  status: PropertyIntegrationStatus;
  aiKeys: {
    primaryKeysConfigured: boolean;
    fallbackKeyConfigured: boolean;
  };
  notificationsPath?: (module: TelegramChannel['id']) => string;
  hideGoogleOAuth?: boolean;
  /** Parking slots use a single Telegram channel (bot + templates on notifications page). */
  telegramLayout?: 'property' | 'parking';
}) {
  const orgContext = useOptionalOrgContext();

  const resolveNotificationsPath =
    notificationsPath ??
    ((module: TelegramChannel['id']) => {
      if (!orgContext) return '#';
      return propertyNotificationsPath(orgContext.orgSlug, orgContext.propertySlug, module);
    });

  const telegramChannels: TelegramChannel[] =
    telegramLayout === 'parking'
      ? [
          {
            id: 'parking',
            label: 'Parking',
            status: status.telegram.marketing,
          },
          {
            id: 'finance',
            label: 'Finance',
            status: status.telegram.finance,
          },
        ]
      : [
          {
            id: 'marketing',
            label: 'Marketing',
            status: status.telegram.marketing,
          },
          {
            id: 'staff',
            label: 'Staff',
            status: status.telegram.staff,
          },
          {
            id: 'operations',
            label: 'Operations',
            status: status.telegram.admin,
          },
          {
            id: 'finance',
            label: 'Finance',
            status: status.telegram.finance,
          },
          {
            id: 'maintenance',
            label: 'Maintenance',
            status: status.telegram.maintenance,
          },
          {
            id: 'chat',
            label: 'Chat',
            status: status.telegram.chat ?? {
              tokenConfigured: false,
              chatIdConfigured: false,
              tokenSource: 'none' as const,
              chatIdSource: 'none' as const,
              secretsEncryptionConfigured: false,
            },
          },
        ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
          Google
        </h4>
        <GoogleIntegrationBlock status={status} hideOAuth={hideGoogleOAuth} />
      </div>

      <div className="space-y-2">
        <h4 className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
          Telegram
        </h4>
        <TelegramIntegrationBlock
          channels={telegramChannels}
          notificationsPath={resolveNotificationsPath}
        />
      </div>

      <div className="space-y-2">
        <h4 className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
          AI services
        </h4>
        <div className="border-border bg-card overflow-hidden rounded-xl border p-4 shadow-sm">
          <AiIntegrationCard
            variant="nested"
            primaryKeysConfigured={aiKeys.primaryKeysConfigured}
            fallbackKeyConfigured={aiKeys.fallbackKeyConfigured}
          />
        </div>
      </div>
    </div>
  );
}
