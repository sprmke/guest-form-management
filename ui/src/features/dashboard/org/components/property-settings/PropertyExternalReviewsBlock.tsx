import { useEffect, useMemo, useState } from 'react';

import { MessageSquare, Plus, Star } from 'lucide-react';

import { TelegramManageDialog } from '@/features/dashboard/bookings/components/telegram-notifications/TelegramManageDialog';
import { withStorageUrlCacheBust } from '@/features/dashboard/bookings/lib/storageUrls';
import { PropertyExternalReviewImageField } from '@/features/dashboard/org/components/property-settings/PropertyExternalReviewImageField';
import { SettingsField } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import {
  createEmptyExternalReview,
  externalReviewModerationLabel,
  externalReviewSourceLabel,
  externalReviewsAggregateLabel,
  MAX_PROPERTY_EXTERNAL_REVIEWS,
  type ExternalReviewSource,
  type ExternalReviewModerationStatus,
  type PropertyExternalReview,
} from '@/features/dashboard/org/lib/propertyExternalReviews';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

function aggregateToneClass(tone: ReturnType<typeof externalReviewsAggregateLabel>['tone']) {
  switch (tone) {
    case 'live':
      return 'font-medium text-emerald-800 dark:text-emerald-300';
    case 'pending':
    case 'mixed':
      return 'text-amber-800/90 dark:text-amber-200';
    default:
      return 'text-muted-foreground';
  }
}

function moderationDotClass(status: PropertyExternalReview['moderationStatus']) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-500';
    case 'rejected':
      return 'bg-destructive';
    default:
      return 'bg-amber-500';
  }
}

function moderationBadgeVariant(
  status: ExternalReviewModerationStatus
): 'success' | 'secondary' | 'destructive' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function reviewNavLabel(review: PropertyExternalReview, index: number) {
  const name = review.reviewerName.trim();
  if (name) return name;
  const snippet = review.reviewText.trim().slice(0, 32);
  if (snippet) return snippet;
  return `Review ${index + 1}`;
}

function MiniStarRating({ value, compact = false }: { value: number | null; compact?: boolean }) {
  const rating = value ?? 5;
  return (
    <span className="inline-flex items-center gap-px" aria-hidden>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            compact ? 'size-2' : 'size-3',
            star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25'
          )}
        />
      ))}
    </span>
  );
}

function StarRatingPicker({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled?: boolean;
  onChange: (rating: number) => void;
}) {
  const rating = value ?? 5;
  return (
    <div className="flex h-10 items-center" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          aria-label={`${star} stars`}
          aria-pressed={star <= rating}
          onClick={() => onChange(star)}
          className="inline-flex size-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg disabled:opacity-50 sm:size-9 sm:min-h-0 sm:min-w-0"
        >
          <Star
            className={cn(
              'size-[18px]',
              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewNavItem({
  review,
  index,
  selected,
  disabled,
  onSelect,
}: {
  review: PropertyExternalReview;
  index: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const thumb = review.imageUrl?.trim() ? withStorageUrlCacheBust(review.imageUrl, null) : null;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors disabled:opacity-50',
        selected
          ? 'bg-primary/10 border-primary/25 border'
          : 'hover:bg-muted/50 border border-transparent'
      )}
    >
      <div
        className={cn(
          'border-border bg-muted/30 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border',
          selected && 'border-primary/20'
        )}
      >
        {thumb ? (
          <img src={thumb} alt="" className="size-full object-cover" />
        ) : (
          <MessageSquare className="text-muted-foreground size-3.5" aria-hidden />
        )}
      </div>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm font-medium leading-tight',
            selected ? 'text-foreground' : 'text-foreground/90'
          )}
        >
          {reviewNavLabel(review, index)}
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          <MiniStarRating value={review.starRating} />
          <span
            className={cn(
              'size-1 shrink-0 rounded-full',
              moderationDotClass(review.moderationStatus)
            )}
            aria-hidden
          />
          <span className="text-muted-foreground truncate text-[11px]">
            {externalReviewSourceLabel(review.source)}
          </span>
        </span>
      </span>
    </button>
  );
}

function ReviewMobileNavTile({
  review,
  index,
  selected,
  disabled,
  onSelect,
}: {
  review: PropertyExternalReview;
  index: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const thumb = review.imageUrl?.trim() ? withStorageUrlCacheBust(review.imageUrl, null) : null;
  const label = reviewNavLabel(review, index);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-label={label}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex min-h-[44px] min-w-0 flex-1 flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-colors disabled:opacity-50',
        selected
          ? 'bg-primary/10 border-primary/25'
          : 'border-border/60 hover:bg-muted/40 bg-background'
      )}
    >
      <div className="relative shrink-0">
        <div
          className={cn(
            'border-border bg-muted/30 flex size-9 items-center justify-center overflow-hidden rounded-md border',
            selected && 'border-primary/20'
          )}
        >
          {thumb ? (
            <img src={thumb} alt="" className="size-full object-cover" />
          ) : (
            <MessageSquare className="text-muted-foreground size-3.5" aria-hidden />
          )}
        </div>
        <span
          className={cn(
            'ring-background absolute -right-0.5 -top-0.5 size-1.5 rounded-full ring-1',
            moderationDotClass(review.moderationStatus)
          )}
          aria-hidden
        />
      </div>
      <span className="w-full truncate text-center text-[10px] font-medium leading-tight">
        {label}
      </span>
      <MiniStarRating value={review.starRating} compact />
    </button>
  );
}

function ReviewListToolbar({
  reviewCount,
  atLimit,
  disabled,
  onAdd,
  className,
}: {
  reviewCount: number;
  atLimit: boolean;
  disabled?: boolean;
  onAdd: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center justify-between gap-3', className)}>
      <span className="text-muted-foreground min-w-0 truncate text-xs font-medium tabular-nums sm:text-sm">
        {reviewCount}/{MAX_PROPERTY_EXTERNAL_REVIEWS} reviews
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || atLimit}
        className="min-h-[44px] shrink-0 gap-1.5"
        onClick={onAdd}
      >
        <Plus className="size-4" />
        Add
      </Button>
    </div>
  );
}

function ReviewEditorPanel({
  review,
  index,
  disabled,
  onChange,
  onRemove,
}: {
  review: PropertyExternalReview;
  index: number;
  disabled?: boolean;
  onChange: (next: PropertyExternalReview) => void;
  onRemove: () => void;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h4 className="text-foreground text-sm font-semibold sm:text-[15px]">
            Review {index + 1}
          </h4>
          <Badge variant={moderationBadgeVariant(review.moderationStatus)}>
            {externalReviewModerationLabel(review.moderationStatus)}
          </Badge>
        </div>
        <Button
          type="button"
          variant="link"
          size="sm"
          disabled={disabled}
          className="text-destructive hover:text-destructive/80 min-h-[44px] shrink-0 px-1"
          onClick={onRemove}
        >
          Delete
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField id={`review-source-${review.id}`} label="Source">
            <Select
              value={review.source}
              disabled={disabled}
              onValueChange={(value: ExternalReviewSource) =>
                onChange({ ...review, source: value })
              }
            >
              <SelectTrigger id={`review-source-${review.id}`} className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="airbnb">Airbnb</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </SettingsField>

          <SettingsField id={`review-reviewer-${review.id}`} label="Reviewer">
            <Input
              id={`review-reviewer-${review.id}`}
              disabled={disabled}
              value={review.reviewerName}
              onChange={(event) => onChange({ ...review, reviewerName: event.target.value })}
              className="h-10"
              autoComplete="off"
            />
          </SettingsField>
        </div>

        <SettingsField label="Rating">
          <StarRatingPicker
            value={review.starRating}
            disabled={disabled}
            onChange={(starRating) => onChange({ ...review, starRating })}
          />
        </SettingsField>

        <SettingsField id={`review-text-${review.id}`} label="Review">
          <Textarea
            id={`review-text-${review.id}`}
            disabled={disabled}
            value={review.reviewText}
            onChange={(event) => onChange({ ...review, reviewText: event.target.value })}
            rows={4}
            className="min-h-[112px] resize-y"
          />
        </SettingsField>

        <Separator className="bg-border/60" />

        <SettingsField label="Screenshot">
          <PropertyExternalReviewImageField
            reviewId={review.id}
            imageUrl={review.imageUrl}
            disabled={disabled}
            onImageUrlChange={(imageUrl) => onChange({ ...review, imageUrl })}
          />
        </SettingsField>

        <SettingsField id={`review-proof-${review.id}`} label="Proof URL">
          <Input
            id={`review-proof-${review.id}`}
            type="url"
            disabled={disabled}
            value={review.proofUrl ?? ''}
            onChange={(event) =>
              onChange({ ...review, proofUrl: event.target.value.trim() || null })
            }
            className="h-10"
            placeholder="https://"
            autoComplete="off"
            spellCheck={false}
          />
        </SettingsField>
      </div>
    </div>
  );
}

export function PropertyExternalReviewsBlock({
  reviews,
  disabled,
  error,
  onReviewsChange,
  onInteract,
}: {
  reviews: PropertyExternalReview[];
  disabled?: boolean;
  error?: string | null;
  onReviewsChange: (reviews: PropertyExternalReview[]) => void;
  onInteract: () => void;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleReviews = useMemo(() => reviews.slice(0, MAX_PROPERTY_EXTERNAL_REVIEWS), [reviews]);
  const reviewCount = visibleReviews.length;
  const atLimit = reviewCount >= MAX_PROPERTY_EXTERNAL_REVIEWS;
  const aggregate = externalReviewsAggregateLabel(visibleReviews);

  const selectedIndex = visibleReviews.findIndex((review) => review.id === selectedId);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const activeReview = visibleReviews[activeIndex] ?? null;

  useEffect(() => {
    if (!manageOpen) return;
    if (visibleReviews.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!visibleReviews.some((review) => review.id === selectedId)) {
      setSelectedId(visibleReviews[0]?.id ?? null);
    }
  }, [manageOpen, visibleReviews, selectedId]);

  function updateReview(index: number, next: PropertyExternalReview) {
    onInteract();
    onReviewsChange(visibleReviews.map((review, i) => (i === index ? next : review)));
  }

  function removeReview(id: string) {
    onInteract();
    const index = visibleReviews.findIndex((review) => review.id === id);
    const nextReviews = visibleReviews.filter((review) => review.id !== id);
    onReviewsChange(nextReviews);
    const fallback = nextReviews[Math.min(index, nextReviews.length - 1)]?.id ?? null;
    setSelectedId(fallback);
  }

  function addReview() {
    onInteract();
    if (atLimit) return;
    const next = createEmptyExternalReview();
    onReviewsChange([...visibleReviews, next]);
    setSelectedId(next.id);
  }

  return (
    <>
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="border-border bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border sm:size-11">
                <MessageSquare className="text-primary size-5 sm:size-[22px]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sidebar-foreground text-sm font-bold sm:text-[13px]">
                    External reviews
                  </h3>
                  <Badge variant="outline" className="text-[11px] font-medium">
                    {reviewCount}/{MAX_PROPERTY_EXTERNAL_REVIEWS}
                  </Badge>
                </div>
                <p
                  className={cn(
                    'mt-1.5 text-xs sm:text-[11px]',
                    aggregateToneClass(aggregate.tone)
                  )}
                >
                  {aggregate.label}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className={cn(
                'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4',
                'border-primary/30 bg-primary/5 text-primary border text-sm font-semibold sm:w-auto sm:text-[13px]',
                'hover:border-primary/40 hover:bg-primary/10 transition-colors'
              )}
            >
              Manage
            </button>
          </div>
          {error ? <p className="text-destructive mt-3 text-xs">{error}</p> : null}
        </div>
      </div>

      <TelegramManageDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        title="External reviews"
        size="sidebar"
        bodyClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto py-4 md:max-h-[min(calc(92dvh-7rem),680px)] md:overflow-hidden md:py-5"
      >
        {reviewCount === 0 ? (
          <div className="border-border/60 bg-muted/10 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-4 py-12">
            <div className="border-border bg-background mb-4 flex size-12 items-center justify-center rounded-xl border shadow-sm">
              <MessageSquare className="text-primary size-5" aria-hidden />
            </div>
            <Button
              type="button"
              disabled={disabled}
              className="min-h-[44px] gap-2"
              onClick={addReview}
            >
              <Plus className="size-4" />
              Add review
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row md:overflow-hidden">
            <div
              className="md:border-border/60 flex w-full min-w-0 shrink-0 flex-col md:w-[15rem] md:border-r md:pr-4 lg:w-[18rem]"
              role="tablist"
              aria-label="Reviews"
            >
              <ReviewListToolbar
                reviewCount={reviewCount}
                atLimit={atLimit}
                disabled={disabled}
                onAdd={addReview}
                className="mb-2 shrink-0"
              />

              <div className="flex min-w-0 gap-1.5 md:hidden">
                {visibleReviews.map((review, index) => (
                  <ReviewMobileNavTile
                    key={review.id}
                    review={review}
                    index={index}
                    selected={review.id === activeReview?.id}
                    disabled={disabled}
                    onSelect={() => setSelectedId(review.id)}
                  />
                ))}
              </div>

              <div className="hidden min-w-0 flex-col gap-1 md:flex md:min-h-0 md:flex-1 md:overflow-y-auto">
                {visibleReviews.map((review, index) => (
                  <ReviewNavItem
                    key={review.id}
                    review={review}
                    index={index}
                    selected={review.id === activeReview?.id}
                    disabled={disabled}
                    onSelect={() => setSelectedId(review.id)}
                  />
                ))}
              </div>
            </div>

            {activeReview ? (
              <div className="border-border/60 mt-4 min-h-0 min-w-0 flex-1 border-t pb-5 sm:px-5 md:mt-0 md:overflow-y-auto md:overscroll-contain md:border-t-0">
                <ReviewEditorPanel
                  key={activeReview.id}
                  review={activeReview}
                  index={activeIndex}
                  disabled={disabled}
                  onChange={(next) => updateReview(activeIndex, next)}
                  onRemove={() => removeReview(activeReview.id)}
                />
              </div>
            ) : null}
          </div>
        )}
      </TelegramManageDialog>
    </>
  );
}
