import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Loader2, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import type { GuestChatMessage } from '@/features/guest/chat/lib/guestChatApi';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  messages: GuestChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => Promise<void>;
  sending: boolean;
  hasOlderMessages?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
};

export function GuestChatThread({
  className,
  messages,
  isLoading,
  onSend,
  sending,
  hasOlderMessages = false,
  loadingOlder = false,
  onLoadOlder,
}: Props) {
  const [draft, setDraft] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const shouldSmoothScrollRef = useRef(false);
  const prevTailKeyRef = useRef('');
  const prevScrollHeightRef = useRef(0);
  const loadingOlderRef = useRef(loadingOlder);
  loadingOlderRef.current = loadingOlder;

  const messageTailKey = messages[messages.length - 1]?.id ?? '';

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || isLoading) return;

    if (loadingOlder) {
      prevScrollHeightRef.current = el.scrollHeight;
      return;
    }

    const prevTail = prevTailKeyRef.current;
    const tailChanged = messageTailKey !== prevTail;
    prevTailKeyRef.current = messageTailKey;

    if (prevScrollHeightRef.current > 0 && tailChanged) {
      el.scrollTop += el.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
      return;
    }

    if (tailChanged || shouldSmoothScrollRef.current) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: shouldSmoothScrollRef.current ? 'smooth' : 'auto',
      });
      shouldSmoothScrollRef.current = false;
    }
  }, [messages, isLoading, loadingOlder, messageTailKey]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const scrollRoot = scrollContainerRef.current;
    if (!sentinel || !hasOlderMessages || loadingOlder || !onLoadOlder) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingOlderRef.current) {
          onLoadOlder();
        }
      },
      { root: scrollRoot, rootMargin: '80px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasOlderMessages, loadingOlder, onLoadOlder, messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    try {
      shouldSmoothScrollRef.current = true;
      await onSend(text);
      setDraft('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4"
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-2/3 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div ref={topSentinelRef} className="h-px w-full shrink-0" aria-hidden />
            {hasOlderMessages && onLoadOlder ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-10 min-h-[44px]"
                  disabled={loadingOlder}
                  onClick={onLoadOlder}
                >
                  {loadingOlder ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    'Load earlier messages'
                  )}
                </Button>
              </div>
            ) : null}
            {messages.map((msg) => {
              const outbound = msg.direction === 'inbound';
              return (
                <div
                  key={msg.id}
                  className={cn('flex flex-col gap-1.5', outbound ? 'items-end' : 'items-start')}
                >
                  <div
                    className={cn(
                      'max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                      outbound
                        ? 'bg-primary text-primary-foreground'
                        : 'border-border/60 bg-card text-foreground border'
                    )}
                  >
                    {msg.body_text?.trim() || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-border bg-background shrink-0 border-t pt-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message"
            rows={1}
            className="max-h-32 min-h-[44px] resize-none py-3"
            aria-label="Message"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="min-h-[44px] min-w-[44px] shrink-0"
            disabled={!draft.trim() || sending}
            onClick={() => void handleSend()}
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <SendHorizontal className="size-5" aria-hidden />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
