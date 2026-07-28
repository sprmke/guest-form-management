import { Check, MoreHorizontal, Settings2 } from 'lucide-react';

import type { MarketingSidebarMenuItem } from '@/features/dashboard/marketing/components/shared/MarketingSidebarSection';
import { useVisibleThumbnailRequest } from '@/features/dashboard/marketing/hooks/useVisibleThumbnailRequest';
import {
  marketingFormatMeta,
  templateThumbnailAspectRatio,
  templateThumbnailMaxHeight,
  type FormatOrientation,
} from '@/features/dashboard/marketing/lib/marketingFormats';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Props = {
  name: string;
  selected?: boolean;
  onClick: () => void;
  onCustomize?: () => void;
  menuItems?: MarketingSidebarMenuItem[];
  thumbnailUrl?: string | null;
  thumbnailLoading?: boolean;
  onRequestThumbnail?: () => void;
  /** Canvas pixel dimensions — drives thumbnail frame aspect ratio. */
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  /** Used when width/height omitted (e.g. calendar). */
  thumbnailAspectRatio?: string;
  thumbnailOrientation?: FormatOrientation;
  badge?: string;
  meta?: string;
  layout?: 'grid' | 'row';
};

function resolveThumbnailFrame(
  props: Pick<
    Props,
    'thumbnailWidth' | 'thumbnailHeight' | 'thumbnailAspectRatio' | 'thumbnailOrientation'
  >
) {
  const width = props.thumbnailWidth ?? 1;
  const height = props.thumbnailHeight ?? 1;
  const orientation = props.thumbnailOrientation ?? marketingFormatMeta(width, height).orientation;
  const aspectRatio = props.thumbnailAspectRatio ?? templateThumbnailAspectRatio(width, height);
  const maxHeight = templateThumbnailMaxHeight(orientation);

  return { aspectRatio, maxHeight, orientation };
}

function previewFrameStyle(frame: ReturnType<typeof resolveThumbnailFrame>) {
  if (frame.orientation === 'portrait' && frame.maxHeight) {
    return {
      aspectRatio: frame.aspectRatio,
      height: frame.maxHeight,
      width: 'auto' as const,
      maxWidth: '100%',
    };
  }

  return {
    aspectRatio: frame.aspectRatio,
    maxHeight: frame.maxHeight,
    width: '100%' as const,
  };
}

function TemplatePreviewFrame({
  selected,
  thumbnailUrl,
  thumbnailLoading,
  badge,
  frame,
}: {
  selected?: boolean;
  thumbnailUrl?: string | null;
  thumbnailLoading?: boolean;
  badge?: string;
  frame: ReturnType<typeof resolveThumbnailFrame>;
}) {
  return (
    <div
      className={cn(
        'relative mx-auto overflow-hidden rounded-lg transition-all duration-200',
        'bg-gradient-to-br from-neutral-900/[0.06] via-neutral-900/[0.04] to-neutral-900/[0.02]',
        'ring-border/60 shadow-sm ring-1',
        selected && 'ring-primary shadow-md ring-2',
        !selected && 'group-hover:ring-primary/35 group-hover:shadow'
      )}
      style={previewFrameStyle(frame)}
      aria-busy={thumbnailLoading || !thumbnailUrl}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="size-full object-contain object-center"
          draggable={false}
        />
      ) : (
        <Skeleton className="absolute inset-0 size-full rounded-none" aria-hidden />
      )}

      {badge ? (
        <span className="absolute right-1 top-1 z-10 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {badge}
        </span>
      ) : null}

      {selected ? (
        <span className="bg-primary absolute left-1 top-1 z-10 flex size-5 items-center justify-center rounded-full shadow-sm">
          <Check className="text-primary-foreground size-3" strokeWidth={3} aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

export function MarketingTemplateCard({
  name,
  selected,
  onClick,
  onCustomize,
  menuItems,
  thumbnailUrl,
  thumbnailLoading = false,
  onRequestThumbnail,
  thumbnailWidth,
  thumbnailHeight,
  thumbnailAspectRatio: aspectRatioProp,
  thumbnailOrientation,
  badge,
  meta,
  layout = 'grid',
}: Props) {
  const frame = resolveThumbnailFrame({
    thumbnailWidth,
    thumbnailHeight,
    thumbnailAspectRatio: aspectRatioProp,
    thumbnailOrientation,
  });

  const visibilityRef = useVisibleThumbnailRequest({
    enabled: Boolean(onRequestThumbnail) && !thumbnailUrl,
    onVisible: () => onRequestThumbnail?.(),
  });

  const actionBar =
    (menuItems && menuItems.length > 0) || onCustomize ? (
      <div className="absolute right-0.5 top-0.5 z-20 flex gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        {onCustomize ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCustomize();
            }}
            aria-label={`Customize ${name}`}
            title="Advanced settings"
            className="bg-background/90 text-muted-foreground hover:text-foreground flex size-7 min-h-[28px] min-w-[28px] items-center justify-center rounded-md shadow-sm backdrop-blur-sm transition-colors"
          >
            <Settings2 className="size-3.5" aria-hidden />
          </button>
        ) : null}
        {menuItems && menuItems.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="bg-background/90 size-7 min-h-[28px] min-w-[28px] rounded-md shadow-sm backdrop-blur-sm"
                aria-label={`${name} options`}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="size-3.5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-[min(calc(100vw-24px),16rem)]">
              {menuItems.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className={cn(item.destructive && 'text-destructive focus:text-destructive')}
                  onClick={item.onSelect}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    ) : null;

  if (layout === 'row') {
    const rowThumbStyle = {
      aspectRatio: frame.aspectRatio,
      width: frame.orientation === 'portrait' ? '2.5rem' : '2.75rem',
      maxHeight: '2.75rem',
    };

    return (
      <div
        ref={visibilityRef}
        className={cn(
          'group relative min-w-0 overflow-hidden rounded-lg transition-colors',
          selected ? 'bg-primary/5' : 'hover:bg-muted/40'
        )}
      >
        <button
          type="button"
          onClick={onClick}
          className="flex min-h-[44px] w-full min-w-0 items-center gap-2.5 px-1 py-1.5 text-left"
        >
          <div
            className={cn(
              'relative shrink-0 overflow-hidden rounded-md',
              'bg-gradient-to-br from-neutral-900/[0.06] to-neutral-900/[0.02]',
              'ring-border/60 ring-1',
              selected && 'ring-primary ring-2'
            )}
            style={rowThumbStyle}
            aria-busy={thumbnailLoading || !thumbnailUrl}
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt=""
                className="size-full object-contain object-center"
                draggable={false}
              />
            ) : (
              <Skeleton className="absolute inset-0 size-full rounded-none" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-xs font-medium', selected && 'text-primary')}>{name}</p>
            {meta ? <p className="text-muted-foreground truncate text-[10px]">{meta}</p> : null}
          </div>
        </button>
        {actionBar}
      </div>
    );
  }

  return (
    <div
      ref={visibilityRef}
      className={cn(
        'group relative min-w-0 rounded-lg transition-colors',
        selected ? 'bg-primary/5' : 'hover:bg-muted/20'
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full min-w-0 flex-col gap-1.5 px-1 py-1.5 text-left"
      >
        <TemplatePreviewFrame
          selected={selected}
          thumbnailUrl={thumbnailUrl}
          thumbnailLoading={thumbnailLoading}
          badge={badge}
          frame={frame}
        />
        <div className="min-w-0 px-0.5">
          <p
            className={cn(
              'line-clamp-2 text-center text-xs font-medium leading-snug',
              selected ? 'text-primary' : 'text-foreground'
            )}
          >
            {name}
          </p>
          {meta ? (
            <p
              className="text-muted-foreground mt-0.5 line-clamp-1 text-center text-[10px]"
              aria-label={meta}
              title={meta}
            >
              {meta}
            </p>
          ) : null}
        </div>
      </button>
      {actionBar}
    </div>
  );
}
