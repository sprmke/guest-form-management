import * as React from 'react';

import { CheckCircle2, Circle, Loader2, ScanSearch } from 'lucide-react';

import { useDiscoverTelegramChats } from '@/features/dashboard/bookings/hooks/useDiscoverTelegramChats';
import { formatTelegramChatTypeLabel } from '@/features/dashboard/bookings/lib/telegramDiscoverChats';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  botToken: string;
  chatId: string;
  disabled?: boolean;
  onChatIdSelect: (chatId: string) => void;
};

export function TelegramChatIdFinder({ botToken, chatId, disabled, onChatIdSelect }: Props) {
  const discover = useDiscoverTelegramChats();
  const trimmedToken = botToken.trim();
  const canScan = Boolean(trimmedToken) && !disabled;
  const chats = discover.data?.chats ?? [];
  const hasScanned = discover.isSuccess || discover.isError;
  const hint = discover.data?.hint;
  const error =
    discover.data?.error ??
    discover.data?.getMe?.error ??
    (discover.error ? discover.error.message : undefined);
  const botUsername = discover.data?.getMe?.username;

  React.useEffect(() => {
    discover.reset();
  }, [trimmedToken]);

  const onScan = () => {
    if (!canScan) return;
    discover.mutate(trimmedToken);
  };

  return (
    <div className="border-border/60 bg-muted/15 space-y-3 rounded-xl border px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <p className="text-foreground text-sm font-medium">Find chat ID</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Add the bot to your group and send a message, then scan.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canScan || discover.isPending}
          className="min-h-[44px] w-full shrink-0 gap-2 sm:w-auto"
          onClick={onScan}
        >
          {discover.isPending ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <ScanSearch className="size-4 shrink-0" aria-hidden />
          )}
          {discover.isPending ? 'Scanning…' : 'Scan for chats'}
        </Button>
      </div>

      {!trimmedToken ? (
        <p className="text-muted-foreground text-xs">Enter a bot token first.</p>
      ) : null}

      {error ? <p className="text-destructive text-xs">{error}</p> : null}

      {hasScanned && !error && chats.length === 0 ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {hint ?? 'No group chats found yet.'}
        </p>
      ) : null}

      {botUsername && chats.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Bot <span className="text-foreground font-medium">@{botUsername}</span>
        </p>
      ) : null}

      {chats.length > 0 ? (
        <ul className="space-y-2" role="listbox" aria-label="Discovered Telegram chats">
          {chats.map((chat) => {
            const selected = chatId.trim() === chat.chatId;
            return (
              <li key={chat.chatId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={disabled}
                  onClick={() => onChatIdSelect(chat.chatId)}
                  className={cn(
                    'border-border/60 bg-card hover:border-primary/40 flex min-h-[44px] w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    selected && 'border-primary bg-primary/5 ring-primary/20 ring-1'
                  )}
                >
                  <span className="mt-0.5 shrink-0" aria-hidden>
                    {selected ? (
                      <CheckCircle2 className="text-primary size-4" />
                    ) : (
                      <Circle className="text-muted-foreground size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-foreground text-sm font-medium">{chat.title}</span>
                      <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                        {formatTelegramChatTypeLabel(chat.type)}
                      </span>
                    </span>
                    <span className="text-muted-foreground mt-0.5 block font-mono text-xs">
                      {chat.chatId}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
