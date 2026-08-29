import { useRef, type ChangeEvent } from 'react';

import { Loader2, Upload, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

import {
  OrgSettingsField,
  OrgSettingsFieldSpan,
} from '@/features/dashboard/org/components/org-settings/OrgSettingsFields';
import {
  useClearOrgSettingsImage,
  type OrgSettingsFieldSource,
} from '@/features/dashboard/org/hooks/useOrgSettings';
import { useUploadOrgSettingsAsset } from '@/features/dashboard/org/hooks/useUploadOrgSettingsAsset';

import { Button } from '@/components/ui/button';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

const LOGO_FRAME_CLASS = 'relative size-40 shrink-0 overflow-hidden rounded-xl border sm:size-44';

export function OrgSettingsImageField({
  id,
  label,
  help,
  source,
  disabled,
  imageUrl,
  previewAlt,
  uploadLabel = 'Upload image',
  replaceLabel = 'Replace image',
  required = false,
  error = null,
  onInteract,
}: {
  id: string;
  label: string;
  help?: string;
  source?: OrgSettingsFieldSource;
  disabled?: boolean;
  imageUrl: string | null;
  previewAlt: string;
  uploadLabel?: string;
  replaceLabel?: string;
  required?: boolean;
  error?: string | null;
  onInteract?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMut = useUploadOrgSettingsAsset();
  const clearMut = useClearOrgSettingsImage();
  const busy = disabled || uploadMut.isPending || clearMut.isPending;
  const hasStoredCustom = source === 'db';
  const hasImage = Boolean(imageUrl?.trim());
  const allowReset = hasStoredCustom && !required;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onInteract?.();
    try {
      await uploadMut.mutateAsync(file);
      toast.success(`${label} updated`);
    } catch (err) {
      toast.error(friendlyToastError(err, 'Upload failed'));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleReset() {
    try {
      await clearMut.mutateAsync();
      toast.success(`${label} reset to default`);
    } catch (err) {
      toast.error(friendlyToastError(err, 'Reset failed'));
    }
  }

  return (
    <OrgSettingsFieldSpan>
      <OrgSettingsField id={id} label={label} help={help} required={required} error={error}>
        <div className="space-y-3">
          {uploadMut.isPending ? (
            <div
              className={cn(
                LOGO_FRAME_CLASS,
                'border-border/60 bg-muted/20 text-muted-foreground flex flex-col items-center justify-center gap-2 text-sm'
              )}
            >
              <Loader2 className="size-5 animate-spin" aria-hidden />
              Uploading…
            </div>
          ) : hasImage ? (
            <div className={cn(LOGO_FRAME_CLASS, 'border-border/60 bg-muted/20 group/image')}>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onInteract?.();
                  fileRef.current?.click();
                }}
                aria-label={hasStoredCustom ? replaceLabel : uploadLabel}
                aria-invalid={Boolean(error)}
                className={cn(
                  'relative size-full overflow-hidden border-0 bg-transparent p-0',
                  'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  !busy && 'cursor-pointer',
                  busy && !uploadMut.isPending && 'cursor-not-allowed opacity-60'
                )}
              >
                <img
                  src={imageUrl!}
                  alt={previewAlt}
                  width={176}
                  height={176}
                  className={cn(
                    'size-full object-cover object-center',
                    uploadMut.isPending && 'opacity-50'
                  )}
                />
                <span
                  className={cn(
                    'bg-background/80 text-foreground pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-sm font-medium transition-opacity motion-reduce:transition-none',
                    'opacity-0 group-focus-within/image:opacity-100 group-hover/image:opacity-100'
                  )}
                  aria-hidden
                >
                  <Upload className="text-primary size-5" />
                  <span>{hasStoredCustom ? replaceLabel : uploadLabel}</span>
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onInteract?.();
                fileRef.current?.click();
              }}
              aria-label={uploadLabel}
              aria-invalid={Boolean(error)}
              className={cn(
                LOGO_FRAME_CLASS,
                'bg-muted/20 text-muted-foreground flex flex-col items-center justify-center gap-2.5 border-dashed text-sm',
                error ? 'border-destructive' : 'border-border',
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                !busy && 'hover:bg-muted/30 hover:text-foreground cursor-pointer',
                busy && 'cursor-not-allowed opacity-60'
              )}
            >
              <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                <ImagePlus className="size-5" aria-hidden />
              </span>
              <span className="text-foreground font-medium">{uploadLabel}</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(event) => void handleFileChange(event)}
          />
          {allowReset ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="min-h-[44px]"
              onClick={() => void handleReset()}
            >
              {clearMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Reset to default'
              )}
            </Button>
          ) : null}
        </div>
      </OrgSettingsField>
    </OrgSettingsFieldSpan>
  );
}
