import type { ReactNode } from 'react';

import { Sparkles } from 'lucide-react';

import { ChatDeliveryTicks } from '@/components/chat/ChatDeliveryTicks';
import { ChatHighlightedText } from '@/components/chat/ChatHighlightedText';
import { ChatReplyPreview } from '@/components/chat/ChatReplyPreview';
import type { OutboundDeliveryStatus } from '@/lib/chat/chatMessageFormat';
import { formatChatBubbleTime } from '@/lib/chat/chatMessageFormat';
import { cn } from '@/lib/utils';

export type ChatDeliveryStatus = OutboundDeliveryStatus;

type Props = {
  bodyText: string | null;
  outbound: boolean;
  sentAt: string;
  deliveryStatus?: OutboundDeliveryStatus | null;
  isAiGenerated?: boolean;
  edited?: boolean;
  unsent?: boolean;
  replyPreviewText?: string | null;
  highlightQuery?: string;
  activeHighlightRange?: { start: number; end: number } | null;
  onRetry?: () => void;
  className?: string;
  children?: ReactNode;
  /** Rendered beside the bubble (vertically centered), not below the timestamp. */
  actions?: ReactNode;
};

export function ChatMessageBubble({
  bodyText,
  outbound,
  sentAt,
  deliveryStatus = null,
  isAiGenerated = false,
  edited = false,
  unsent = false,
  replyPreviewText = null,
  highlightQuery = '',
  activeHighlightRange = null,
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
          {children ??
            (unsent || !highlightQuery.trim() ? (
              <p className={cn('whitespace-pre-wrap break-words', unsent && 'text-[13px]')}>
                {bodyText?.trim() || '—'}
              </p>
            ) : (
              <ChatHighlightedText
                text={bodyText?.trim() || '—'}
                query={highlightQuery}
                activeRange={activeHighlightRange}
                outbound={outbound}
              />
            ))}
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
        {!unsent && outbound ? (
          <ChatDeliveryTicks status={deliveryStatus ?? 'sent'} onRetry={onRetry} />
        ) : null}
      </div>
    </div>
  );
}
