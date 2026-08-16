import { useMemo } from 'react';

import { useParams } from 'react-router-dom';

import { Plus } from 'lucide-react';



import { ChatComposer } from '@/features/dashboard/ai-assistant/components/ChatComposer';
import { ChatThread } from '@/features/dashboard/ai-assistant/components/ChatThread';
import { useAiAssistantChat } from '@/features/dashboard/ai-assistant/hooks/useAiAssistantChat';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AiAssistantPanel({ open, onOpenChange }: Props) {
  const propertyId = usePropertyIdParam();
  const { bookingId } = useParams<{ bookingId?: string }>();
  const pageContext = useMemo(
    () => ({ propertyId, bookingId: bookingId ?? null }),
    [propertyId, bookingId]
  );

  const {
    messages,
    pending,
    error,
    upgradeHook,
    sendMessage,
    resolveAction,
    startNewConversation,
  } = useAiAssistantChat(pageContext);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-border/60 flex-row items-center justify-between space-y-0 border-b p-3">
          <SheetTitle className="text-base">AI Assistant</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={startNewConversation}
            aria-label="Start new conversation"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </SheetHeader>

        <ChatThread messages={messages} pending={pending} onResolveAction={resolveAction} />

        {error && <p className="text-destructive px-3 pb-1 text-xs">{error}</p>}
        {upgradeHook && (
          <p className="text-warning px-3 pb-1 text-xs">
            You&apos;ve hit today&apos;s message limit for the assistant.
          </p>
        )}

        <ChatComposer onSend={(text) => void sendMessage(text)} disabled={pending} />
      </SheetContent>
    </Sheet>
  );
}
