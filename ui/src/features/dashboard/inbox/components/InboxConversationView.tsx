import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { ArrowLeft, Loader2, SendHorizontal, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';

import {
  InboxMediaPreviewDialog,
  InboxMessageMediaTile,
} from '@/features/dashboard/inbox/components/InboxMediaPreviewDialog';
import { PlatformLogo } from '@/features/dashboard/inbox/components/PlatformLogo';
import {
  isMessagingWindowOpen,
  messagingWindowLabel,
  platformLabel,
} from '@/features/dashboard/inbox/lib/inboxFormat';
import {
  inboxAttachmentPreviews,
  type InboxAttachmentPreview,
} from '@/features/dashboard/inbox/lib/inboxMessageAttachments';
import { templatesForConversationPlatform } from '@/features/dashboard/inbox/lib/quickReplyGroups';
import type {
  InboxConversation,
  InboxMessage,
  InboxTemplate,
} from '@/features/dashboard/inbox/types/inbox';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Props = {
  conversation: InboxConversation | null;
  messages: InboxMessage[];
  isLoading: boolean;
  canReply: boolean;
  templates: InboxTemplate[];
  onBack?: () => void;
  onSend: (text: string, privateReply?: boolean) => Promise<void>;
  onSuggest: () => Promise<{ suggestion: string; flagged: boolean }>;
  sending: boolean;
  suggesting: boolean;
  hasOlderMessages?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
};

export function InboxConversationView({
  conversation,
  messages,
  isLoading,
  canReply,
  templates,
  onBack,
  onSend,
  onSuggest,
  sending,
  suggesting,
  hasOlderMessages = false,
  loadingOlder = false,
  onLoadOlder,
}: Props) {
  const [draft, setDraft] = useState('');
  const [draftFromAi, setDraftFromAi] = useState(false);
  const [draftAiFlagged, setDraftAiFlagged] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<InboxAttachmentPreview | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const shouldSmoothScrollRef = useRef(false);
  const prevTailKeyRef = useRef('');
  const prevScrollHeightRef = useRef(0);
  const loadingOlderRef = useRef(loadingOlder);
  loadingOlderRef.current = loadingOlder;

  const visibleTemplates = useMemo(() => {
    if (!conversation) return [];
    return templatesForConversationPlatform(templates, conversation.platform);
  }, [templates, conversation?.platform]);

  const messageTailKey = useMemo(() => {
    const last = messages[messages.length - 1];
    if (!last) return '';
    return `${last.id}:${last.sent_at}:${last.body_text?.length ?? 0}`;
  }, [messages]);

  useEffect(() => {
    setDraft('');
    setDraftFromAi(false);
    setDraftAiFlagged(false);
    shouldSmoothScrollRef.current = false;
  }, [conversation?.id]);

  useLayoutEffect(() => {
    if (isLoading || !conversation || messages.length === 0) return;
    const node = scrollContainerRef.current;
    if (!node) return;

    const tailChanged = messageTailKey !== prevTailKeyRef.current;
    const hadTail = prevTailKeyRef.current.length > 0;
    prevTailKeyRef.current = messageTailKey;

    if (!tailChanged && hadTail) {
      const delta = node.scrollHeight - prevScrollHeightRef.current;
      if (delta > 0) node.scrollTop += delta;
      prevScrollHeightRef.current = node.scrollHeight;
      return;
    }

    const behavior = shouldSmoothScrollRef.current ? 'smooth' : 'auto';
    shouldSmoothScrollRef.current = true;
    node.scrollTo({ top: node.scrollHeight, behavior });
    prevScrollHeightRef.current = node.scrollHeight;
  }, [messageTailKey, conversation?.id, isLoading, conversation, messages.length]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root || !hasOlderMessages || !onLoadOlder || loadingOlder) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingOlderRef.current) {
          onLoadOlder();
        }
      },
      { root, rootMargin: '80px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasOlderMessages, loadingOlder, onLoadOlder, conversation?.id, messages.length]);

  const openPreview = (att: InboxAttachmentPreview) => {
    if (att.kind === 'image' || att.kind === 'video') {
      setPreviewAttachment(att);
      return;
    }
    window.open(att.url, '_blank', 'noopener,noreferrer');
  };

  if (!conversation) {
    return (
      <div className="bg-muted/20 text-muted-foreground flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-2">
        <p className="text-sm">Select a conversation</p>
      </div>
    );
  }

  const name =
    conversation.participant_name?.trim() ||
    (conversation.conversation_type === 'comment' ? 'Comment' : 'Guest');
  const isWeb = conversation.platform === 'web';
  const windowLabel = isWeb
    ? null
    : messagingWindowLabel(conversation.messaging_window_expires_at, conversation.last_inbound_at);
  const windowOpen =
    isWeb ||
    conversation.conversation_type === 'comment' ||
    isMessagingWindowOpen(conversation.messaging_window_expires_at, conversation.last_inbound_at);
  const canSend =
    draft.trim().length > 0 &&
    !sending &&
    (windowOpen || conversation.conversation_type === 'comment');

  const handleSend = async (privateReply = false) => {
    const text = draft.trim();
    if (!text) return;
    try {
      await onSend(text, privateReply);
      setDraft('');
      setDraftFromAi(false);
      setDraftAiFlagged(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleSuggest = async () => {
    try {
      const result = await onSuggest();
      setDraft(result.suggestion);
      setDraftFromAi(true);
      setDraftAiFlagged(result.flagged);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="bg-background flex h-full min-h-0 flex-1 flex-col">
      <InboxMediaPreviewDialog
        attachment={previewAttachment}
        open={!!previewAttachment}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null);
        }}
      />

      <div className="border-border/80 bg-card/30 flex shrink-0 items-center gap-3 border-b px-3 py-3 sm:px-4">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px] lg:hidden"
            onClick={onBack}
            aria-label="Back to list"
          >
            <ArrowLeft className="size-5" />
          </Button>
        )}
        <PlatformLogo platform={conversation.platform} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
            <span>{platformLabel(conversation.platform)}</span>
            {isWeb && conversation.property_name ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{conversation.property_name}</span>
              </>
            ) : null}
            {isWeb && conversation.inquiry_check_in && conversation.inquiry_check_out ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  {conversation.inquiry_check_in} – {conversation.inquiry_check_out}
                </span>
              </>
            ) : null}
            {conversation.conversation_type === 'comment' && (
              <>
                <span aria-hidden>·</span>
                <span>Comment</span>
              </>
            )}
            {windowLabel && conversation.conversation_type === 'dm' && (
              <>
                <span aria-hidden>·</span>
                <span className={windowOpen ? undefined : 'text-destructive font-medium'}>
                  {windowLabel}
                </span>
              </>
            )}
          </div>
        </div>
        {isWeb && conversation.property_slug ? (
          <a
            href={`/properties/${encodeURIComponent(conversation.property_slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary flex min-h-[44px] shrink-0 items-center self-center px-1 text-xs font-medium underline-offset-2 hover:underline"
          >
            View property
          </a>
        ) : null}
        {conversation.linked_post_url && (
          <a
            href={conversation.linked_post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary flex min-h-[44px] shrink-0 items-center self-center px-1 text-xs font-medium underline-offset-2 hover:underline"
          >
            {conversation.conversation_type === 'comment' ? 'View post' : 'View conversation'}
          </a>
        )}
      </div>

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-2/3 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div ref={topSentinelRef} className="h-px w-full shrink-0" aria-hidden />
            {hasOlderMessages && onLoadOlder && (
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
            )}
            {messages.map((msg) => {
              const outbound = msg.direction === 'outbound';
              const attachments = inboxAttachmentPreviews(msg.attachments);
              const hasText = !!msg.body_text?.trim();
              const hasMedia = attachments.length > 0;
              const bubbleClass = cn(
                'max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                outbound
                  ? 'bg-primary text-primary-foreground'
                  : 'border-border/60 bg-card text-foreground border'
              );

              return (
                <div
                  key={msg.id}
                  className={cn('flex flex-col gap-1.5', outbound ? 'items-end' : 'items-start')}
                >
                  {hasText && (
                    <div className={bubbleClass}>
                      <p className="whitespace-pre-wrap break-words">{msg.body_text}</p>
                      {msg.is_ai_generated && (
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] opacity-75">
                          <Sparkles className="size-3" aria-hidden />
                          AI
                        </span>
                      )}
                    </div>
                  )}
                  {hasMedia && (
                    <div
                      className={cn(
                        'flex flex-col gap-1.5',
                        outbound ? 'items-end' : 'items-start'
                      )}
                    >
                      {attachments.map((att, i) => (
                        <InboxMessageMediaTile
                          key={`${msg.id}-att-${i}`}
                          attachment={att}
                          outbound={outbound}
                          onOpen={() => openPreview(att)}
                        />
                      ))}
                    </div>
                  )}
                  {!hasText && !hasMedia && (
                    <div className={cn(bubbleClass, 'text-muted-foreground')}>(attachment)</div>
                  )}
                  {!hasText && hasMedia && msg.is_ai_generated && (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] opacity-75">
                      <Sparkles className="size-3" aria-hidden />
                      AI
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canReply && (
        <div className="border-border/80 bg-muted/20 shrink-0 border-t p-3 sm:p-4">
          <div
            className={cn(
              'border-border/80 bg-background overflow-hidden rounded-xl border shadow-sm transition-shadow',
              'focus-within:border-primary/40 focus-within:ring-primary/10 focus-within:ring-2'
            )}
          >
            {draftFromAi && draft.trim().length > 0 && (
              <div className="border-border/60 flex items-center gap-1.5 border-b px-3.5 py-2 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                <Sparkles className="size-3.5 shrink-0" aria-hidden />
                {draftAiFlagged ? 'AI declined to answer' : 'Suggested by AI'}
              </div>
            )}
            <Textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDraftFromAi(false);
                setDraftAiFlagged(false);
              }}
              placeholder={
                windowOpen || conversation.conversation_type === 'comment'
                  ? 'Write a reply…'
                  : 'Reply window closed'
              }
              className="min-h-[72px] resize-none border-0 bg-transparent px-3.5 py-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={!windowOpen && conversation.conversation_type === 'dm'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) void handleSend();
                }
              }}
            />
            <div className="border-border/60 flex items-center justify-between gap-2 border-t px-2 py-1.5">
              <TooltipProvider delayDuration={300}>
                <div className="flex items-center">
                  {visibleTemplates.length > 0 && (
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground size-10"
                              aria-label="Insert quick reply"
                            >
                              <Zap className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">Quick reply</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="start" className="max-w-[min(90vw,320px)]">
                        {visibleTemplates.map((t) => (
                          <DropdownMenuItem
                            key={t.id}
                            onClick={() => {
                              setDraft(t.body_text);
                              setDraftFromAi(false);
                            }}
                          >
                            <span className="font-medium">{t.title}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10 text-violet-600 hover:bg-violet-500/10 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                        disabled={suggesting}
                        aria-label="Suggest reply"
                        onClick={() => void handleSuggest()}
                      >
                        {suggesting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Suggest</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              <div className="flex items-center gap-2">
                {conversation.conversation_type === 'comment' &&
                  conversation.platform === 'instagram' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-9 min-h-[36px] text-xs"
                      disabled={!canSend}
                      onClick={() => void handleSend(true)}
                    >
                      Private reply
                    </Button>
                  )}
                <Button
                  type="button"
                  size="sm"
                  className="h-9 min-h-[36px] gap-1.5 rounded-lg px-3"
                  disabled={!canSend}
                  onClick={() => void handleSend()}
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Send
                      <SendHorizontal className="size-4" aria-hidden />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
