import { MoreHorizontal, Plug, Sparkles, Zap } from 'lucide-react';

import { InboxAutomationTab } from '@/features/dashboard/inbox/components/InboxAutomationTab';
import { InboxChannelsTab } from '@/features/dashboard/inbox/components/InboxChannelsTab';
import { InboxQuickRepliesTab } from '@/features/dashboard/inbox/components/InboxQuickRepliesTab';
import type {
  ComingSoonPlatform,
  InboxAutomationSettings,
  InboxConnection,
  InboxTemplate,
  SaveInboxTemplatePayload,
} from '@/features/dashboard/inbox/types/inbox';

import {
  MobileHeroActionMenu,
  type MobileHeroActionMenuItem,
} from '@/components/mobile/MobileHeroActionButton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';

export type InboxManageModal = 'channels' | 'quick-replies' | 'automation' | null;

type Props = {
  open: InboxManageModal;
  onOpenChange: (open: InboxManageModal) => void;
  canManage: boolean;
  showSettingsManageTabs?: boolean;
  usingOrgMeta?: boolean;
  connections: InboxConnection[];
  comingSoon: ComingSoonPlatform[];
  connectionsLoading?: boolean;
  connectionsError?: boolean;
  connecting: boolean;
  disconnecting: boolean;
  onConnectMeta: () => void;
  onDisconnectMeta: () => void;
  templates: InboxTemplate[];
  templatesLoading: boolean;
  templatesSaving: boolean;
  onSaveTemplate: (payload: SaveInboxTemplatePayload) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  automationSettings: InboxAutomationSettings | undefined;
  automationLoading: boolean;
  automationSaving: boolean;
  onSaveAutomation: (patch: Partial<InboxAutomationSettings>) => Promise<void>;
};

function buildInboxManageItems(
  showSettingsManageTabs: boolean,
  onOpen: (modal: InboxManageModal) => void
): MobileHeroActionMenuItem[] {
  const items: MobileHeroActionMenuItem[] = [
    {
      key: 'channels',
      label: 'Channels',
      Icon: Plug,
      onSelect: () => onOpen('channels'),
    },
  ];
  if (showSettingsManageTabs) {
    items.push(
      {
        key: 'quick-replies',
        label: 'Quick replies',
        Icon: Zap,
        onSelect: () => onOpen('quick-replies'),
      },
      {
        key: 'automation',
        label: 'Automation',
        Icon: Sparkles,
        onSelect: () => onOpen('automation'),
      }
    );
  }
  return items;
}

export function InboxManageToolbar({
  canManage,
  showSettingsManageTabs = true,
  onOpen,
  variant = 'default',
}: {
  canManage: boolean;
  showSettingsManageTabs?: boolean;
  onOpen: (modal: InboxManageModal) => void;
  variant?: 'default' | 'hero';
}) {
  if (!canManage) return null;

  const items = buildInboxManageItems(showSettingsManageTabs, onOpen);

  if (variant === 'hero') {
    return <MobileHeroActionMenu items={items} label="Inbox actions" />;
  }

  if (items.length === 1) {
    const only = items[0]!;
    const Icon = only.Icon;
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 min-h-[44px] gap-1.5 px-2.5 sm:min-h-9 sm:px-3"
        onClick={only.onSelect}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">{only.label}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 min-h-[44px] gap-1.5 px-2.5 sm:min-h-9 sm:px-3"
          aria-label="Inbox actions"
        >
          <MoreHorizontal className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Manage</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {items.map((item) => {
          const Icon = item.Icon;
          return (
            <DropdownMenuItem
              key={item.key}
              onSelect={() => item.onSelect()}
              className="min-h-[44px] gap-2"
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InboxManageModals({
  open,
  onOpenChange,
  canManage,
  showSettingsManageTabs = true,
  usingOrgMeta = false,
  connections,
  comingSoon,
  connectionsLoading = false,
  connectionsError = false,
  connecting,
  disconnecting,
  onConnectMeta,
  onDisconnectMeta,
  templates,
  templatesLoading,
  templatesSaving,
  onSaveTemplate,
  onDeleteTemplate,
  automationSettings,
  automationLoading,
  automationSaving,
  onSaveAutomation,
}: Props) {
  if (!canManage) return null;

  return (
    <>
      <ResponsiveModal
        open={open === 'channels'}
        onOpenChange={(next) => onOpenChange(next ? 'channels' : null)}
      >
        <ResponsiveModalContent className="max-h-[min(90dvh,640px)] max-w-[min(calc(100vw-1.5rem),44rem)] overflow-y-auto sm:max-w-[min(92vw,44rem)]">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Channels</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <InboxChannelsTab
            connections={connections}
            comingSoon={comingSoon}
            usingOrgMeta={usingOrgMeta}
            statusLoading={connectionsLoading}
            statusError={connectionsError}
            canManage={canManage}
            connecting={connecting}
            disconnecting={disconnecting}
            onConnectMeta={onConnectMeta}
            onDisconnectMeta={onDisconnectMeta}
          />
        </ResponsiveModalContent>
      </ResponsiveModal>

      {showSettingsManageTabs ? (
        <>
          <ResponsiveModal
            open={open === 'quick-replies'}
            onOpenChange={(next) => onOpenChange(next ? 'quick-replies' : null)}
          >
            <ResponsiveModalContent
              sheetLayout="split"
              className="flex max-h-[min(92dvh,760px)] min-h-0 max-w-[min(calc(100vw-1.5rem),52rem)] flex-col overflow-hidden sm:max-w-[min(92vw,52rem)] lg:min-h-[min(80dvh,560px)]"
            >
              <ResponsiveModalHeader className="shrink-0">
                <ResponsiveModalTitle>Quick replies</ResponsiveModalTitle>
              </ResponsiveModalHeader>
              <div className="flex min-h-0 flex-1 flex-col">
                <InboxQuickRepliesTab
                  templates={templates}
                  isLoading={templatesLoading}
                  saving={templatesSaving}
                  onSave={onSaveTemplate}
                  onDelete={onDeleteTemplate}
                />
              </div>
            </ResponsiveModalContent>
          </ResponsiveModal>

          <ResponsiveModal
            open={open === 'automation'}
            onOpenChange={(next) => onOpenChange(next ? 'automation' : null)}
          >
            <ResponsiveModalContent className="max-h-[min(92dvh,720px)] max-w-[min(calc(100vw-1.5rem),44rem)] overflow-y-auto sm:max-w-[min(92vw,44rem)]">
              <ResponsiveModalHeader>
                <ResponsiveModalTitle>Automation</ResponsiveModalTitle>
              </ResponsiveModalHeader>
              <InboxAutomationTab
                settings={automationSettings}
                isLoading={automationLoading}
                saving={automationSaving}
                onSave={onSaveAutomation}
              />
            </ResponsiveModalContent>
          </ResponsiveModal>
        </>
      ) : null}
    </>
  );
}
