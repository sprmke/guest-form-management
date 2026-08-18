import { useId, useLayoutEffect, useRef, useState } from 'react';

import { FileText, ImagePlus, Paperclip, Send, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  ChatComposerBookingPicker,
  type PinnedBooking,
} from '@/features/dashboard/ai-assistant/components/ChatComposerBookingPicker';
import {
  ASSISTANT_FILE_ACCEPT,
  ASSISTANT_IMAGE_ACCEPT,
  fileToBase64Payload,
  isAssistantImageMime,
  validateAssistantFiles,
  type ChatAttachmentPayload,
  type ChatSendInput,
} from '@/features/dashboard/ai-assistant/lib/chatAttachments';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const COMPOSER_MAX_ROWS = 10;
const COMPOSER_MIN_HEIGHT_PX = 40;

function syncComposerHeight(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  const computedMax = Number.parseFloat(window.getComputedStyle(textarea).maxHeight);
  const fallbackMax = COMPOSER_MAX_ROWS * 20 + 16;
  const cap = Number.isFinite(computedMax) && computedMax > 0 ? computedMax : fallbackMax;
  const next = Math.min(Math.max(textarea.scrollHeight, COMPOSER_MIN_HEIGHT_PX), cap);
  textarea.style.height = `${next}px`;
  textarea.style.overflowY = textarea.scrollHeight > next + 1 ? 'auto' : 'hidden';
}

type Props = {
  onSend: (input: ChatSendInput) => void;
  disabled?: boolean;
  pageBookingId?: string | null;
  overlayContainer?: HTMLElement | null;
};

export function ChatComposer({ onSend, disabled, pageBookingId, overlayContainer }: Props) {
  const [value, setValue] = useState('');
  const [pinnedBooking, setPinnedBooking] = useState<PinnedBooking | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachmentPayload[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const reactId = useId();
  const imageInputId = `${reactId}-image`;
  const fileInputId = `${reactId}-file`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const sync = () => syncComposerHeight(textareaRef.current);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [value]);

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    const error = validateAssistantFiles(files, attachments.length);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      const next = await Promise.all(files.map(fileToBase64Payload));
      setAttachments((prev) => [...prev, ...next]);
    } catch {
      toast.error('Could not read file');
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    if (disabled) return;
    if (!trimmed && attachments.length === 0) return;
    onSend({
      text: trimmed,
      bookingId: pinnedBooking?.id ?? null,
      propertyId: pinnedBooking?.propertyId ?? null,
      bookingLabel: pinnedBooking?.label ?? null,
      attachments,
    });
    setValue('');
    setAttachments([]);
  };

  return (
    <div className="border-border/60 shrink-0 border-t p-3">
      {(pinnedBooking || attachments.length > 0) && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {pinnedBooking ? (
            <span className="bg-muted text-foreground inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-xs">
              <span className="truncate">{pinnedBooking.label}</span>
              <button
                type="button"
                className="focus-visible:ring-ring inline-flex min-h-[24px] min-w-[24px] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2"
                aria-label="Remove booking"
                onClick={() => setPinnedBooking(null)}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ) : null}
          {attachments.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="bg-muted text-foreground inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-xs"
            >
              {isAssistantImageMime(file.mimeType) ? (
                <ImagePlus className="h-3 w-3 shrink-0" aria-hidden />
              ) : (
                <FileText className="h-3 w-3 shrink-0" aria-hidden />
              )}
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                className="focus-visible:ring-ring inline-flex min-h-[24px] min-w-[24px] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2"
                aria-label={`Remove ${file.name}`}
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="border-border bg-background focus-within:ring-ring flex flex-col rounded-xl border p-1.5 focus-within:ring-2">
        <input
          id={imageInputId}
          type="file"
          accept={ASSISTANT_IMAGE_ACCEPT}
          className="sr-only"
          multiple
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = '';
            setAttachOpen(false);
          }}
        />
        <input
          id={fileInputId}
          type="file"
          accept={ASSISTANT_FILE_ACCEPT}
          className="sr-only"
          multiple
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = '';
            setAttachOpen(false);
          }}
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask about bookings, finance, or maintenance…"
          aria-label="Message"
          rows={1}
          disabled={disabled}
          className="text-foreground placeholder:text-muted-foreground min-h-10 w-full resize-none overflow-hidden bg-transparent px-2.5 pb-1 pt-1.5 text-left text-sm leading-5 [overflow-wrap:anywhere] focus-visible:outline-none disabled:opacity-50"
          style={{ maxHeight: `min(calc(${COMPOSER_MAX_ROWS}lh + 1rem), 40dvh)` }}
        />

        <div className="flex items-center gap-0.5">
          <Popover open={attachOpen} onOpenChange={setAttachOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label="Attach"
                aria-expanded={attachOpen}
                className="min-h-[44px] min-w-[44px] shrink-0"
              >
                <Paperclip className="h-4 w-4" aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="top"
              container={overlayContainer}
              className="w-44 p-1"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <label
                htmlFor={imageInputId}
                className={cn(
                  'native-press hover:bg-muted/60 flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm',
                  disabled && 'pointer-events-none opacity-50'
                )}
              >
                <ImagePlus className="size-4 shrink-0" aria-hidden />
                Photo
              </label>
              <label
                htmlFor={fileInputId}
                className={cn(
                  'native-press hover:bg-muted/60 flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm',
                  disabled && 'pointer-events-none opacity-50'
                )}
              >
                <FileText className="size-4 shrink-0" aria-hidden />
                File
              </label>
            </PopoverContent>
          </Popover>

          <ChatComposerBookingPicker
            value={pinnedBooking}
            onChange={setPinnedBooking}
            pageBookingId={pageBookingId}
            disabled={disabled}
            overlayContainer={overlayContainer}
          />

          <Button
            size="icon"
            onClick={submit}
            disabled={disabled || (!value.trim() && attachments.length === 0)}
            aria-label="Send message"
            className="ml-auto min-h-[44px] min-w-[44px] shrink-0"
          >
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
