import { Plug, Sparkles, Zap } from 'lucide-react';

import { InboxAutomationTab } from '@/features/dashboard/inbox/components/InboxAutomationTab';
import { InboxChannelsTab } from '@/features/dashboard/inbox/components/InboxChannelsTab';
import { InboxQuickRepliesTab } from '@/features/dashboard/inbox/components/InboxQuickRepliesTab';
import type {
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
  connectionsLoading?: boolean;
  connectionsError?: boolean;
  connecting: boolean;
  disconnecting: boolean;
  resubscribing?: boolean;
  onConnectMeta: () => void;
  onDisconnectMeta: () => void;
  onResubscribeMeta: () => void;
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

function InboxManageActionButton({ item }: { item: MobileHeroActionMenuItem }) {
  const Icon = item.Icon;
  return (
    <Button type="button" variant="outline" onClick={item.onSelect}>
      <Icon aria-hidden />
      {item.label}
    </Button>
  );
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
    return <InboxManageActionButton item={items[0]!} />;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {items.map((item) => (
        <InboxManageActionButton key={item.key} item={item} />
      ))}
    </div>
  );
}

export function InboxManageModals({
  open,
  onOpenChange,
  canManage,
  showSettingsManageTabs = true,
  usingOrgMeta = false,
  connections,
  connectionsLoading = false,
  connectionsError = false,
  connecting,
  disconnecting,
  resubscribing = false,
  onConnectMeta,
  onDisconnectMeta,
  onResubscribeMeta,
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
            usingOrgMeta={usingOrgMeta}
            statusLoading={connectionsLoading}
            statusError={connectionsError}
            canManage={canManage}
            connecting={connecting}
            disconnecting={disconnecting}
            resubscribing={resubscribing}
            onConnectMeta={onConnectMeta}
            onDisconnectMeta={onDisconnectMeta}
            onResubscribeMeta={onResubscribeMeta}
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
