import { Plug, Sparkles, Zap } from 'lucide-react';

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

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type InboxManageModal = 'channels' | 'quick-replies' | 'automation' | null;

type Props = {
  open: InboxManageModal;
  onOpenChange: (open: InboxManageModal) => void;
  canManage: boolean;
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

export function InboxManageToolbar({
  canManage,
  onOpen,
}: {
  canManage: boolean;
  onOpen: (modal: InboxManageModal) => void;
}) {
  if (!canManage) return null;

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 min-h-[44px] gap-1.5 px-2.5 sm:min-h-9 sm:px-3"
        onClick={() => onOpen('channels')}
      >
        <Plug className="size-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Channels</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 min-h-[44px] gap-1.5 px-2.5 sm:min-h-9 sm:px-3"
        onClick={() => onOpen('quick-replies')}
      >
        <Zap className="size-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Quick replies</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 min-h-[44px] gap-1.5 px-2.5 sm:min-h-9 sm:px-3"
        onClick={() => onOpen('automation')}
      >
        <Sparkles className="size-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Automation</span>
      </Button>
    </div>
  );
}

export function InboxManageModals({
  open,
  onOpenChange,
  canManage,
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
      <Dialog
        open={open === 'channels'}
        onOpenChange={(next) => onOpenChange(next ? 'channels' : null)}
      >
        <DialogContent className="max-h-[min(90dvh,640px)] max-w-[min(calc(100vw-1.5rem),44rem)] overflow-y-auto sm:max-w-[min(92vw,44rem)]">
          <DialogHeader>
            <DialogTitle>Channels</DialogTitle>
          </DialogHeader>
          <InboxChannelsTab
            connections={connections}
            comingSoon={comingSoon}
            statusLoading={connectionsLoading}
            statusError={connectionsError}
            canManage={canManage}
            connecting={connecting}
            disconnecting={disconnecting}
            onConnectMeta={onConnectMeta}
            onDisconnectMeta={onDisconnectMeta}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={open === 'quick-replies'}
        onOpenChange={(next) => onOpenChange(next ? 'quick-replies' : null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,760px)] min-h-[min(80dvh,560px)] max-w-[min(calc(100vw-1.5rem),52rem)] flex-col overflow-hidden sm:max-w-[min(92vw,52rem)]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Quick replies</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <InboxQuickRepliesTab
              templates={templates}
              isLoading={templatesLoading}
              saving={templatesSaving}
              onSave={onSaveTemplate}
              onDelete={onDeleteTemplate}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={open === 'automation'}
        onOpenChange={(next) => onOpenChange(next ? 'automation' : null)}
      >
        <DialogContent className="max-h-[min(92dvh,720px)] max-w-[min(calc(100vw-1.5rem),44rem)] overflow-y-auto sm:max-w-[min(92vw,44rem)]">
          <DialogHeader>
            <DialogTitle>Automation</DialogTitle>
          </DialogHeader>
          <InboxAutomationTab
            settings={automationSettings}
            isLoading={automationLoading}
            saving={automationSaving}
            onSave={onSaveAutomation}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
