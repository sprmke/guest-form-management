import type { ReactNode } from 'react';

import { AlertCircle, Check, Loader2, Sparkles } from 'lucide-react';

import { ChatReplyPreview } from '@/components/chat/ChatReplyPreview';
import { formatChatBubbleTime } from '@/lib/chat/chatMessageFormat';
import { cn } from '@/lib/utils';

export type ChatDeliveryStatus =
  'sending' | 'sent' | 'delivered' | 'read' | 'failed' | string | null;

type Props = {
  bodyText: string | null;
  outbound: boolean;
  sentAt: string;
  deliveryStatus?: ChatDeliveryStatus;
  isAiGenerated?: boolean;
  edited?: boolean;
  unsent?: boolean;
  replyPreviewText?: string | null;
  onRetry?: () => void;
  className?: string;
  children?: ReactNode;
  /** Rendered beside the bubble (vertically centered), not below the timestamp. */
  actions?: ReactNode;
};

function DeliveryIndicator({
  status,
  outbound,
  onRetry,
}: {
  status: ChatDeliveryStatus;
  outbound: boolean;
  onRetry?: () => void;
}) {
  if (!outbound) return null;

  if (status === 'sending') {
    return <Loader2 className="size-3 animate-spin opacity-70" aria-label="Sending" />;
  }

  if (status === 'failed') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="text-destructive inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 text-[11px] font-medium"
        aria-label="Failed to send. Tap to retry."
      >
        <AlertCircle className="size-3.5 shrink-0" aria-hidden />
        Retry
      </button>
    );
  }

  if (status === 'read') {
    return (
      <span className="inline-flex items-center gap-0.5 opacity-80" aria-label="Read">
        <Check className="size-3" aria-hidden />
        <Check className="-ml-1.5 size-3" aria-hidden />
      </span>
    );
  }

  if (status === 'delivered' || status === 'sent' || status === null || status === undefined) {
    return (
      <span className="inline-flex opacity-70" aria-label="Sent">
        <Check className="size-3" aria-hidden />
      </span>
    );
  }

  return null;
}

export function ChatMessageBubble({
  bodyText,
  outbound,
  sentAt,
  deliveryStatus = null,
  isAiGenerated = false,
  edited = false,
  unsent = false,
  replyPreviewText = null,
  onRetry,
  className,
  children,
  actions,
}: Props) {
  const timeLabel = formatChatBubbleTime(sentAt);
  const bubbleClass = cn(
    'max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
    unsent
      ? 'bg-muted/45 text-muted-foreground border-border/50 border italic'
      : outbound
        ? 'bg-primary text-primary-foreground'
        : 'border-border/60 bg-card text-foreground border',
    deliveryStatus === 'failed' && outbound && !unsent && 'opacity-80'
  );

  return (
    <div className={cn('flex max-w-[min(100%,28rem)] flex-col gap-1', className)}>
      <div
        className={cn(
          'group/msg flex max-w-full items-center gap-0.5',
          outbound ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        <div className={bubbleClass}>
          {!unsent && replyPreviewText ? (
            <ChatReplyPreview preview={replyPreviewText} outbound={outbound} />
          ) : null}
          {children ?? (
            <p className={cn('whitespace-pre-wrap break-words', unsent && 'text-[13px]')}>
              {bodyText?.trim() || '—'}
            </p>
          )}
          {!unsent && isAiGenerated ? (
            <span
              className={cn(
                'mt-1.5 inline-flex items-center gap-1 text-[10px]',
                outbound ? 'opacity-75' : 'text-muted-foreground'
              )}
            >
              <Sparkles className="size-3" aria-hidden />
              Automated
            </span>
          ) : null}
        </div>
        {actions}
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1',
          outbound ? 'justify-end' : 'justify-start'
        )}
      >
        {timeLabel ? (
          <time className="text-muted-foreground text-[11px] tabular-nums" dateTime={sentAt}>
            {timeLabel}
          </time>
        ) : null}
        {edited && !unsent ? (
          <span className="text-muted-foreground text-[11px]">Edited</span>
        ) : null}
        {!unsent ? (
          <DeliveryIndicator status={deliveryStatus} outbound={outbound} onRetry={onRetry} />
        ) : null}
      </div>
    </div>
  );
}
