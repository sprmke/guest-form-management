import { useEffect, useRef, useState } from 'react';

import { Loader2, Paperclip, Trash2, Video } from 'lucide-react';
import { toast } from 'sonner';

import { useUploadSupportTicketAttachment } from '@/features/dashboard/help-support/hooks/useSupportTickets';
import type { SupportTicketAttachmentDraft } from '@/features/dashboard/help-support/lib/supportTicketSchema';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';
const MAX_ATTACHMENTS = 3;
const MAX_BYTES = 20 * 1024 * 1024;

type Props = {
  value: SupportTicketAttachmentDraft[];
  onChange: (next: SupportTicketAttachmentDraft[]) => void;
  disabled?: boolean;
};

export function TicketAttachmentDropzone({ value, onChange, disabled = false }: Props) {
  const upload = useUploadSupportTicketAttachment();
  const [isUploading, setIsUploading] = useState(false);
  const previewUrlsRef = useRef<Map<string, string>>(new Map());
  const [, forceRender] = useState(0);

  useEffect(() => {
    const previews = previewUrlsRef.current;
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const isBusy = disabled || isUploading;
  const canAddMore = value.length < MAX_ATTACHMENTS;

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_ATTACHMENTS - value.length;
    const toUpload = Array.from(files).slice(0, remaining);

    setIsUploading(true);
    let next = value;
    for (const file of toUpload) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 20 MB`);
        continue;
      }
      try {
        const attachment = await upload.mutateAsync(file);
        previewUrlsRef.current.set(attachment.path, URL.createObjectURL(file));
        next = [...next, attachment];
        onChange(next);
        forceRender((n) => n + 1);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Failed to upload ${file.name}`);
      }
    }
    setIsUploading(false);
  };

  const handleRemove = (path: string) => {
    const url = previewUrlsRef.current.get(path);
    if (url) {
      URL.revokeObjectURL(url);
      previewUrlsRef.current.delete(path);
    }
    onChange(value.filter((item) => item.path !== path));
  };

  return (
    <div className="space-y-2.5">
      {value.length > 0 ? (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {value.map((item) => {
            const previewUrl = previewUrlsRef.current.get(item.path) ?? null;
            const isVideo = item.mimeType.startsWith('video/');
            return (
              <div
                key={item.path}
                className="bg-muted ring-border/80 group relative aspect-square overflow-hidden rounded-lg ring-1 ring-inset"
              >
                {previewUrl && !isVideo ? (
                  <img src={previewUrl} alt="" className="absolute inset-0 size-full object-cover" />
                ) : previewUrl && isVideo ? (
                  <video
                    src={previewUrl}
                    className="absolute inset-0 size-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Paperclip className="text-muted-foreground size-5" aria-hidden />
                  </div>
                )}
                {isVideo ? (
                  <span className="bg-background/90 absolute bottom-1 left-1 rounded p-1">
                    <Video className="size-3" aria-hidden />
                  </span>
                ) : null}
                {!disabled ? (
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => handleRemove(item.path)}
                    className="bg-background/95 text-destructive absolute right-1 top-1 flex size-6 items-center justify-center rounded-full shadow-sm"
                  >
                    <Trash2 className="size-3" aria-hidden />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {canAddMore ? (
        <div className="relative inline-flex">
          <input
            id="ticket-attachment-input"
            type="file"
            accept={ACCEPT}
            multiple
            disabled={isBusy}
            className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:pointer-events-none"
            onChange={(event) => {
              void handleFileSelect(event.target.files);
              event.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            tabIndex={-1}
            className={cn('pointer-events-none min-h-[44px]')}
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Paperclip className="size-4" aria-hidden />
            )}
            Attach screenshot or video
          </Button>
        </div>
      ) : null}
      <p className="text-muted-foreground text-xs">
        Up to {MAX_ATTACHMENTS} files, 20 MB each · JPEG, PNG, WebP, MP4, or MOV
      </p>
    </div>
  );
}
