import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, Search } from 'lucide-react';

import {
  HERO_SEARCH_SINGLE_MONTH_PANEL_WIDTH,
  heroSearchCalendarClassNames,
  heroSearchCalendarMonthCount,
  heroSearchWhenPanelWidth,
} from '@/features/guest/marketing/guest-landing/lib/heroSearchCalendarClassNames';
import { lerp, smoothstep } from '@/features/guest/marketing/shared/lib/listingScrollSearchEasing';
import { resolveListingSearchPreferType } from '@/features/guest/marketing/shared/lib/listingScrollSearchPaths';
import type { ListingSearchPreferType } from '@/features/guest/marketing/shared/lib/listingSearchPreferType';
import { SearchSuggestedEmptyPanel } from '@/features/guest/search/components/SearchSuggestedEmptyPanel';
import {
  flattenSuggestions,
  SearchSuggestionPanel,
  type SuggestionCategoryTarget,
} from '@/features/guest/search/components/SearchSuggestionPanel';
import { useSearchSuggestions } from '@/features/guest/search/hooks/useSearchSuggestions';
import type { SuggestedSearchItem } from '@/features/guest/search/hooks/useSuggestedCategoryListings';
import { requestGuestGeolocation } from '@/features/guest/search/lib/geolocation';
import {
  isConceptSuggestionId,
  isNearbyQuery,
  nearbyCategoryFromQuery,
  nearbyDisplayLabel,
  resolveClientSearchIntent,
} from '@/features/guest/search/lib/searchIntents';
import { buildSearchHref, parseSearchParams } from '@/features/guest/search/lib/searchParams';
import type {
  SearchListingsType,
  SearchSuggestionItem,
} from '@/features/guest/search/types/search';

import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

import type { DateRange } from 'react-day-picker';

type SearchField = 'where' | 'when' | 'who';

export const HERO_SEARCH_FIELDS = ['where', 'when', 'who'] as const;
export type HeroSearchField = (typeof HERO_SEARCH_FIELDS)[number];

const DEFAULT_FIELD_ORDER: SearchField[] = ['where', 'when', 'who'];

interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

interface DropdownLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

const PILL_SPRING = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.82 };
/** Panel position + size — keep width/height on the same spring so the calendar does not squash. */
const PANEL_SPRING = { type: 'spring' as const, stiffness: 400, damping: 38, mass: 0.88 };

type SegmentPillBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function ActiveSegmentPill({
  bounds,
  roundedClass,
}: {
  bounds: SegmentPillBounds;
  roundedClass: string;
}) {
  return (
    <motion.div
      aria-hidden
      className={cn('bg-background pointer-events-none absolute z-0 shadow-md', roundedClass)}
      initial={false}
      animate={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }}
      transition={PILL_SPRING}
    />
  );
}

function estimatedPanelHeight(field: SearchField, calendarMonths: number) {
  switch (field) {
    case 'where':
      return 380;
    case 'when':
      return calendarMonths === 2 ? 450 : 460;
    case 'who':
      return 320;
    default:
      return 360;
  }
}

export interface HeroSearchValues {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: string;
}

interface HeroSearchProps {
  className?: string;
  /** Navigate here on search when `onSearch` is not provided. Default: `/search` */
  redirectTo?: string;
  /**
   * Prefer this listing family in typeahead + `/search` All view (`focus` URL param).
   * Omit to resolve from the current pathname (or existing `focus` on `/search`).
   * “Search all results” always clears focus.
   */
  preferType?: ListingSearchPreferType | null;
  /** Pre-fill "Where" when no `?location=` query param (route-derived on listing pages). */
  defaultLocation?: string;
  /** Local filter mode — skips navigation */
  onSearch?: (values: HeroSearchValues) => void;
  /** Visible segments — omit `who` on parking, services, and other non-guest listings. Default: all three. */
  fields?: HeroSearchField[];
  /** First segment label — `What` on `/services`, default `Where`. */
  whereLabel?: string;
  wherePlaceholder?: string;
  whereCompactPlaceholder?: string;
  /** 0 = expanded hero, 1 = compact header. Scroll morph passes this for smooth interpolation. */
  morphProgress?: number;
  /** Raw scroll morph progress (0–1) for mobile width / dock behavior. */
  scrollProgress?: number;
  /** Compact header-docked style (instant; used when `morphProgress` is omitted). */
  variant?: 'default' | 'compact';
}

function parseDateParam(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const parsed = new Date(`${raw}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseGuestsParam(raw: string | null): GuestCounts {
  const total = Number.parseInt(raw ?? '', 10);
  if (Number.isNaN(total) || total < 1) {
    return { adults: 2, children: 0, infants: 0, pets: 0 };
  }
  return { adults: total, children: 0, infants: 0, pets: 0 };
}

function parseGuestBreakdown(sp: URLSearchParams): GuestCounts {
  const hasBreakdown = sp.has('adults') || sp.has('children') || sp.has('pets');
  if (hasBreakdown) {
    const adults = Number.parseInt(sp.get('adults') ?? '', 10);
    const children = Number.parseInt(sp.get('children') ?? '', 10);
    const pets = Number.parseInt(sp.get('pets') ?? '', 10);
    return {
      adults: Number.isFinite(adults) && adults >= 0 ? Math.max(adults, 1) : 1,
      children: Number.isFinite(children) && children >= 0 ? children : 0,
      infants: 0,
      pets: Number.isFinite(pets) && pets >= 0 ? pets : 0,
    };
  }
  return parseGuestsParam(sp.get('guests'));
}

function readWhereParam(sp: URLSearchParams, fallback = ''): string {
  return (sp.get('where') ?? sp.get('location') ?? fallback).trim() || fallback;
}

function buildSearchValues(
  location: string,
  dateRange: DateRange | undefined,
  guests: GuestCounts
): HeroSearchValues {
  const guestTotal = guests.adults + guests.children;
  return {
    location: location.trim(),
    checkIn: toIsoDate(dateRange?.from),
    checkOut: toIsoDate(dateRange?.to),
    guests: guestTotal > 0 ? String(guestTotal) : '',
  };
}

function formatGuestSummary(counts: GuestCounts) {
  const guestCount = counts.adults + counts.children;
  if (guestCount === 0 && counts.pets === 0) return '';
  const parts: string[] = [];
  if (guestCount > 0) parts.push(`${guestCount} guest${guestCount === 1 ? '' : 's'}`);
  if (counts.pets > 0) parts.push(`${counts.pets} pet${counts.pets === 1 ? '' : 's'}`);
  return parts.join(', ');
}

function formatGuestSummaryCompact(counts: GuestCounts) {
  const guestCount = counts.adults + counts.children;
  if (guestCount > 0) return String(guestCount);
  if (counts.pets > 0) return `${counts.pets} pet`;
  return '';
}

function formatDateRange(range: DateRange | undefined) {
  if (!range?.from) return '';
  if (!range.to) return format(range.from, 'MMM d');
  return `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d')}`;
}

function toIsoDate(date: Date | undefined) {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
}

function preferredPanelWidth(field: SearchField, rootWidth: number, calendarMonths: number) {
  const isMobile = rootWidth < 640;
  if (isMobile) return rootWidth;

  switch (field) {
    case 'where':
      return HERO_SEARCH_SINGLE_MONTH_PANEL_WIDTH;
    case 'when':
      return heroSearchWhenPanelWidth(calendarMonths === 2 ? 2 : 1, rootWidth);
    case 'who':
      return 380;
    default:
      return rootWidth;
  }
}

function computeDropdownLayout(
  field: SearchField,
  rootEl: HTMLElement,
  barEl: HTMLElement,
  segmentEl: HTMLElement,
  calendarMonths: number,
  contentHeight: number
): DropdownLayout {
  const rootRect = rootEl.getBoundingClientRect();
  const barRect = barEl.getBoundingClientRect();
  const segmentRect = segmentEl.getBoundingClientRect();
  const rootWidth = rootRect.width;
  const width = preferredPanelWidth(field, rootWidth, calendarMonths);
  const isMobile = rootWidth < 640;

  let left = 0;
  if (!isMobile) {
    const segmentLeft = segmentRect.left - rootRect.left;
    const segmentCenter = segmentLeft + segmentRect.width / 2;

    if (field === 'where') {
      left = segmentLeft;
    } else if (field === 'when') {
      left = segmentCenter - width / 2;
    } else {
      left = segmentRect.right - rootRect.left - width;
    }

    left = Math.max(0, Math.min(left, rootWidth - width));
  }

  const top = barRect.bottom - rootRect.top + 12;

  return {
    left,
    top,
    width,
    height: contentHeight,
  };
}

interface GuestRowProps {
  label: string;
  subtitle?: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
}

function GuestRow({ label, subtitle, value, onDecrement, onIncrement, min = 0 }: GuestRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-foreground text-sm font-semibold">{label}</p>
        {subtitle ? <p className="text-muted-foreground text-xs">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className={cn(
            'border-border flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border',
            'text-muted-foreground hover:border-foreground/30 transition-colors disabled:opacity-30'
          )}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-foreground w-5 text-center text-sm font-medium tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          aria-label={`Increase ${label}`}
          className={cn(
            'border-border flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border',
            'text-muted-foreground hover:border-foreground/30 transition-colors'
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface SearchSegmentProps {
  field: SearchField;
  label: string;
  value: string;
  placeholder: string;
  activeField: SearchField | null;
  onActivate: (field: SearchField) => void;
  className?: string;
  morphProgress?: number;
  compactPlaceholder?: string;
  /** Single-line header / mobile — no Where/When/Who labels. */
  compactLine?: boolean;
}

const SearchSegment = forwardRef<HTMLButtonElement, SearchSegmentProps>(function SearchSegment(
  {
    field,
    label,
    value,
    placeholder,
    activeField,
    onActivate,
    className,
    morphProgress = 0,
    compactPlaceholder,
    compactLine = false,
  },
  ref
) {
  const isActive = activeField === field;
  const p = morphProgress;
  const labelOpacity = compactLine ? 0 : 1 - smoothstep(0.05, 0.35, p);
  const isFilled = Boolean(value);
  const display = value || (compactLine ? (compactPlaceholder ?? placeholder) : placeholder);

  if (compactLine) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        onClick={() => onActivate(field)}
        className={cn(
          'relative z-[1] flex min-w-0 flex-1 basis-0 items-center justify-center truncate rounded-full px-2 py-2 text-center text-xs',
          className
        )}
      >
        <span
          className={cn(
            'relative truncate',
            isFilled ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium',
            isActive && 'text-foreground font-semibold'
          )}
        >
          {display}
        </span>
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onActivate(field)}
      className={cn(
        'relative z-[1] flex min-h-[52px] min-w-0 flex-1 flex-col justify-center rounded-full px-5 py-3 text-left',
        className
      )}
      style={{
        paddingLeft: `${lerp(25, 14, p)}px`,
        paddingRight: `${lerp(15, 14, p)}px`,
        paddingTop: `${lerp(5, 10, p)}px`,
        paddingBottom: `${lerp(5, 10, p)}px`,
      }}
    >
      {labelOpacity > 0.02 ? (
        <span
          className="text-foreground relative text-xs font-semibold"
          style={{
            opacity: labelOpacity,
            maxHeight: `${labelOpacity * 18}px`,
            overflow: 'hidden',
          }}
        >
          {label}
        </span>
      ) : null}
      <span
        className={cn(
          'relative truncate text-sm',
          labelOpacity > 0.5 && 'mt-0.5',
          isFilled ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium',
          isActive && 'text-foreground font-semibold'
        )}
      >
        {display}
      </span>
    </button>
  );
});

export function HeroSearch({
  className,
  redirectTo: _redirectTo = '/search',
  preferType: preferTypeProp,
  defaultLocation = '',
  onSearch,
  fields = DEFAULT_FIELD_ORDER,
  whereLabel = 'Where',
  wherePlaceholder = 'Search destinations',
  whereCompactPlaceholder = 'Anywhere',
  morphProgress,
  scrollProgress = 0,
  variant = 'default',
}: HeroSearchProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const preferType =
    preferTypeProp !== undefined
      ? preferTypeProp
      : (parseSearchParams(searchParams).focus ?? resolveListingSearchPreferType(pathname));
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const segmentRefs = useRef<Record<SearchField, HTMLButtonElement | null>>({
    where: null,
    when: null,
    who: null,
  });
  const segmentsRowRef = useRef<HTMLDivElement>(null);
  const prevFieldRef = useRef<SearchField | null>(null);
  const hasOpenedRef = useRef(false);
  const [pillBounds, setPillBounds] = useState<SegmentPillBounds | null>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);

  const [activeField, setActiveField] = useState<SearchField | null>(null);
  const [location, setLocation] = useState(() => readWhereParam(searchParams, defaultLocation));

  useEffect(() => {
    setLocation(readWhereParam(searchParams, defaultLocation));
  }, [pathname, defaultLocation, searchParams]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = parseDateParam(searchParams.get('checkIn'));
    const to = parseDateParam(searchParams.get('checkOut'));
    if (!from) return undefined;
    return { from, to: to ?? from };
  });
  const [guests, setGuests] = useState<GuestCounts>(() => parseGuestBreakdown(searchParams));

  useEffect(() => {
    setGuests(parseGuestBreakdown(searchParams));
  }, [pathname, searchParams]);
  const [calendarMonths, setCalendarMonths] = useState(1);
  const [rootWidth, setRootWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [dropdownLayout, setDropdownLayout] = useState<DropdownLayout>({
    left: 0,
    top: 72,
    width: 400,
    height: 360,
  });

  const fieldOrder = fields;
  const showWho = fieldOrder.includes('who');

  useEffect(() => {
    if (!showWho && activeField === 'who') {
      setActiveField(null);
    }
  }, [showWho, activeField]);

  const isExpanded = activeField !== null;
  const morph = morphProgress ?? (variant === 'compact' ? 1 : 0);
  const layoutWidth =
    rootWidth > 0 ? rootWidth : typeof window !== 'undefined' ? window.innerWidth : 1024;
  /** Use viewport — bar width is capped (~768px) and must not drive breakpoint logic. */
  const isNarrowViewport = viewportWidth < 1024;
  /** Desktop hero: labeled Airbnb segments. Header + mobile: compact single-line. */
  const useDesktopHeroBar = !isNarrowViewport && morph <= 0.38;
  const useCompactBar = !useDesktopHeroBar;
  const segmentMorph = morph;
  const effectiveCalendarMonths = heroSearchCalendarMonthCount(calendarMonths, rootWidth, morph);
  const mobileDocked = isNarrowViewport && scrollProgress > 0.65;
  const useTightGuestLabel = isNarrowViewport && (layoutWidth < 380 || mobileDocked);
  const guestSummary = useTightGuestLabel
    ? formatGuestSummaryCompact(guests) || formatGuestSummary(guests)
    : formatGuestSummary(guests);
  const searchButtonSize = isNarrowViewport
    ? mobileDocked
      ? 32
      : lerp(40, 32, segmentMorph)
    : lerp(48, 32, segmentMorph);
  const searchIconSize = lerp(16, 14, segmentMorph);
  const dateSummary = formatDateRange(dateRange);
  const whenPanelWidth = heroSearchWhenPanelWidth(effectiveCalendarMonths, layoutWidth);
  const segmentPillRounded = useCompactBar ? 'rounded-full' : 'rounded-full';

  const measureActivePill = useCallback(() => {
    if (!activeField || !segmentsRowRef.current) {
      setPillBounds(null);
      return;
    }

    const segment = segmentRefs.current[activeField];
    if (!segment) return;

    const rowRect = segmentsRowRef.current.getBoundingClientRect();
    const segmentRect = segment.getBoundingClientRect();

    setPillBounds({
      left: segmentRect.left - rowRect.left,
      top: segmentRect.top - rowRect.top,
      width: segmentRect.width,
      height: segmentRect.height,
    });
  }, [activeField]);

  const slideDirection =
    activeField && prevFieldRef.current
      ? fieldOrder.indexOf(activeField) - fieldOrder.indexOf(prevFieldRef.current)
      : 0;

  const updateDropdownLayout = useCallback(() => {
    if (!activeField || !rootRef.current || !barRef.current) return;
    const segmentEl = segmentRefs.current[activeField];
    if (!segmentEl) return;

    const measured = contentRef.current?.scrollHeight;
    const height =
      measured && measured > 0
        ? measured
        : estimatedPanelHeight(activeField, effectiveCalendarMonths);

    setDropdownLayout(
      computeDropdownLayout(
        activeField,
        rootRef.current,
        barRef.current,
        segmentEl,
        effectiveCalendarMonths,
        height
      )
    );
  }, [activeField, effectiveCalendarMonths]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    prevFieldRef.current = activeField;
  }, [activeField]);

  useLayoutEffect(() => {
    measureActivePill();
    const id = window.requestAnimationFrame(measureActivePill);
    return () => window.cancelAnimationFrame(id);
  }, [
    measureActivePill,
    segmentMorph,
    morph,
    location,
    dateSummary,
    guestSummary,
    rootWidth,
    useCompactBar,
    mobileDocked,
  ]);

  useEffect(() => {
    const row = segmentsRowRef.current;
    if (!row) return;

    const observer = new ResizeObserver(() => measureActivePill());
    observer.observe(row);
    for (const field of fieldOrder) {
      const segment = segmentRefs.current[field];
      if (segment) observer.observe(segment);
    }

    window.addEventListener('resize', measureActivePill);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureActivePill);
    };
  }, [measureActivePill, activeField, useCompactBar, fieldOrder]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setCalendarMonths(mq.matches ? 2 : 1);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const syncWidth = () => {
      const width = el.getBoundingClientRect().width;
      setRootWidth((prev) => (Math.abs(prev - width) < 0.5 ? prev : width));
    };

    syncWidth();
    const ro = new ResizeObserver(syncWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [morph]);

  useLayoutEffect(() => {
    if (!activeField) {
      hasOpenedRef.current = false;
      return;
    }

    const estimate = estimatedPanelHeight(activeField, effectiveCalendarMonths);
    const segmentEl = segmentRefs.current[activeField];
    if (rootRef.current && barRef.current && segmentEl) {
      setDropdownLayout(
        computeDropdownLayout(
          activeField,
          rootRef.current,
          barRef.current,
          segmentEl,
          effectiveCalendarMonths,
          estimate
        )
      );
    }

    const measureId = window.requestAnimationFrame(() => {
      updateDropdownLayout();
      window.requestAnimationFrame(updateDropdownLayout);
    });
    return () => window.cancelAnimationFrame(measureId);
  }, [activeField, effectiveCalendarMonths, morph, dateRange, guests, updateDropdownLayout]);

  useEffect(() => {
    if (!activeField) return;

    const onScroll = () => updateDropdownLayout();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [activeField, updateDropdownLayout]);

  useEffect(() => {
    if (!activeField || !contentRef.current) return;

    const observer = new ResizeObserver(() => {
      updateDropdownLayout();
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [activeField, updateDropdownLayout]);

  useEffect(() => {
    if (!activeField) return;

    const onResize = () => updateDropdownLayout();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeField, updateDropdownLayout]);

  useEffect(() => {
    if (activeField !== 'where') return;
    const id = window.requestAnimationFrame(() => locationInputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [activeField]);

  useEffect(() => {
    if (!activeField) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveField(null);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeField]);

  useEffect(() => {
    if (!activeField) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setActiveField(null);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [activeField]);

  const activateField = useCallback((field: SearchField) => {
    setActiveField(field);
  }, []);

  const suggestionsEnabled = activeField === 'where';
  const { data: suggestionData, isFetching: suggestionsLoading } = useSearchSuggestions(
    location,
    suggestionsEnabled
  );

  const flatSuggestions = flattenSuggestions({
    locations: suggestionData?.locations ?? [],
    developments: suggestionData?.developments ?? [],
    properties: suggestionData?.properties ?? [],
    parkings: suggestionData?.parkings ?? [],
    preferType,
  });

  useEffect(() => {
    setSuggestionIndex(-1);
  }, [location, suggestionData]);

  const selectDestination = (label: string) => {
    setLocation(label);
    setActiveField('when');
  };

  const navigateToSearch = async (
    whereValue: string,
    options?: {
      clearFocus?: boolean;
      type?: SearchListingsType;
      focus?: ListingSearchPreferType | null;
    }
  ) => {
    const values = buildSearchValues(whereValue, dateRange, guests);
    let lat: number | null = null;
    let lng: number | null = null;

    if (isNearbyQuery(whereValue)) {
      const geo = await requestGuestGeolocation();
      if (geo.ok) {
        lat = geo.latitude;
        lng = geo.longitude;
      }
      // Always land on /search — page shows Allow location when coords missing.
    }

    const nearbyCategory =
      options?.focus !== undefined
        ? options.focus
        : (nearbyCategoryFromQuery(whereValue) ?? (options?.clearFocus ? null : preferType));

    const type =
      options?.type ?? (isNearbyQuery(whereValue) && nearbyCategory ? nearbyCategory : 'all');
    const focus =
      options?.focus !== undefined
        ? options.focus
        : options?.clearFocus
          ? null
          : isNearbyQuery(whereValue)
            ? nearbyCategory
            : preferType;

    const whereParam = isNearbyQuery(whereValue)
      ? nearbyDisplayLabel(nearbyCategoryFromQuery(whereValue) ?? nearbyCategory)
      : values.location;

    navigate(
      buildSearchHref({
        where: whereParam,
        checkIn: values.checkIn,
        checkOut: values.checkOut,
        adults: guests.adults,
        children: guests.children,
        infants: 0,
        pets: guests.pets,
        type,
        lat,
        lng,
        focus,
      })
    );
    setActiveField(null);
  };

  const viewSuggestionCategory = (target: SuggestionCategoryTarget) => {
    const whereValue = location.trim();
    if (target.type) {
      void navigateToSearch(whereValue, {
        type: target.type,
        focus: target.type,
        clearFocus: false,
      });
      return;
    }
    // Locations → All results for this where text
    void navigateToSearch(whereValue, { type: 'all', clearFocus: true });
  };

  const selectSuggestion = (item: SearchSuggestionItem) => {
    if (isConceptSuggestionId(item.id)) {
      const intent = resolveClientSearchIntent(item.label);
      const focus = intent.kind === 'concept' ? (intent.preferType ?? null) : null;
      void navigateToSearch(item.label, {
        type: 'all',
        focus,
        clearFocus: !focus,
      });
      return;
    }
    if (item.id === 'nearby' || (item.kind === 'location' && isNearbyQuery(item.label))) {
      void navigateToSearch(nearbyDisplayLabel(preferType), {
        type: preferType ?? 'all',
        focus: preferType,
      });
      return;
    }
    if (item.kind === 'property' && item.slug) {
      navigate(`/properties/${item.slug}`);
      setActiveField(null);
      return;
    }
    if (item.kind === 'development' && item.slug) {
      navigate(`/developments/${item.slug}`);
      setActiveField(null);
      return;
    }
    if (item.kind === 'parking' && item.slug) {
      navigate(`/parkings/${item.slug}`);
      setActiveField(null);
      return;
    }
    selectDestination(item.city || item.label);
  };

  const runSearchNavigation = (clearFocus: boolean) => {
    const values = buildSearchValues(location, dateRange, guests);

    if (onSearch && !clearFocus) {
      onSearch(values);
      setActiveField(null);
      return;
    }

    // Always use unified /search for real results (legacy redirectTo shells ignored).
    void navigateToSearch(values.location, { clearFocus });
  };

  const handleSearch = () => {
    runSearchNavigation(false);
  };

  /** Typeahead “Search all results for …” — unified /search without page focus. */
  const handleSearchAllResults = () => {
    runSearchNavigation(true);
  };

  const pickSuggestedNearby = (label: string) => {
    const category = nearbyCategoryFromQuery(label) ?? preferType;
    void navigateToSearch(nearbyDisplayLabel(category), {
      type: category ?? 'all',
      focus: category,
    });
  };

  const pickSuggestedDestination = (label: string) => {
    if (isNearbyQuery(label)) {
      pickSuggestedNearby(label);
      return;
    }
    selectDestination(label);
  };

  const pickSuggestedListing = (item: SuggestedSearchItem) => {
    if (!item.slug || !item.listingType) return;
    if (item.listingType === 'properties') navigate(`/properties/${item.slug}`);
    else if (item.listingType === 'developments') navigate(`/developments/${item.slug}`);
    else navigate(`/parkings/${item.slug}`);
    setActiveField(null);
  };

  const onWhereKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const liveMode = location.trim().length >= 2;
    if (!liveMode) {
      if (event.key === 'Enter') handleSearch();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSuggestionIndex((current) =>
        flatSuggestions.length === 0 ? -1 : Math.min(current + 1, flatSuggestions.length - 1)
      );
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSuggestionIndex((current) => Math.max(current - 1, -1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (suggestionIndex >= 0 && flatSuggestions[suggestionIndex]) {
        selectSuggestion(flatSuggestions[suggestionIndex]);
        return;
      }
      handleSearch();
      return;
    }
    if (event.key === 'Escape') {
      setActiveField(null);
    }
  };

  const updateGuest = (key: keyof GuestCounts, delta: number) => {
    setGuests((current) => {
      const next = Math.max(key === 'adults' ? 1 : 0, current[key] + delta);
      return { ...current, [key]: next };
    });
  };

  return (
    <div ref={rootRef} className={cn('relative z-50 w-full', className)}>
      <AnimatePresence>
        {isExpanded ? (
          <motion.button
            type="button"
            aria-label="Close search panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            onClick={() => setActiveField(null)}
          />
        ) : null}
      </AnimatePresence>

      <div
        ref={barRef}
        className={cn(
          'border-border bg-muted/80 relative z-50 overflow-hidden rounded-full border shadow-sm',
          isExpanded && 'shadow-md',
          morph > 0.55 && 'shadow-md',
          !isExpanded && useCompactBar && 'overflow-hidden'
        )}
        style={{
          paddingTop: `${useCompactBar ? lerp(mobileDocked ? 4 : 8, 6, segmentMorph) : 8}px`,
          paddingBottom: `${useCompactBar ? lerp(mobileDocked ? 4 : 8, 6, segmentMorph) : 8}px`,
          paddingLeft: `${useCompactBar ? lerp(mobileDocked ? 6 : 8, 10, segmentMorph) : 16}px`,
          paddingRight: `${useCompactBar ? lerp(mobileDocked ? 4 : 8, 10, segmentMorph) : 16}px`,
        }}
      >
        <div ref={segmentsRowRef} className="relative w-full min-w-0">
          {useCompactBar ? (
            <div className="flex w-full min-w-0 items-center">
              {activeField && pillBounds ? (
                <ActiveSegmentPill bounds={pillBounds} roundedClass={segmentPillRounded} />
              ) : null}
              <SearchSegment
                ref={(node) => {
                  segmentRefs.current.where = node;
                }}
                field="where"
                label={whereLabel}
                value={location}
                placeholder={wherePlaceholder}
                compactPlaceholder={whereCompactPlaceholder}
                activeField={activeField}
                onActivate={activateField}
                morphProgress={segmentMorph}
                compactLine
              />

              <div className="bg-border mx-0.5 h-4 w-px shrink-0" aria-hidden />

              <SearchSegment
                ref={(node) => {
                  segmentRefs.current.when = node;
                }}
                field="when"
                label="When"
                value={dateSummary}
                placeholder="Add dates"
                compactPlaceholder="Anytime"
                activeField={activeField}
                onActivate={activateField}
                morphProgress={segmentMorph}
                compactLine
              />

              {showWho ? (
                <>
                  <div className="bg-border mx-0.5 h-4 w-px shrink-0" aria-hidden />

                  <SearchSegment
                    ref={(node) => {
                      segmentRefs.current.who = node;
                    }}
                    field="who"
                    label="Who"
                    value={guestSummary}
                    placeholder="Add guests"
                    compactPlaceholder="Add guests"
                    activeField={activeField}
                    onActivate={activateField}
                    morphProgress={segmentMorph}
                    compactLine
                  />
                </>
              ) : null}

              <button
                type="button"
                onClick={handleSearch}
                aria-label="Search"
                className={cn(
                  'bg-primary text-primary-foreground z-[2] ml-0.5 flex shrink-0 items-center justify-center rounded-full font-semibold shadow-md sm:ml-2',
                  'transition-colors hover:opacity-95'
                )}
                style={{
                  width: searchButtonSize,
                  height: searchButtonSize,
                  minWidth: searchButtonSize,
                  minHeight: searchButtonSize,
                }}
              >
                <Search
                  className="shrink-0"
                  aria-hidden
                  style={{
                    width: searchIconSize,
                    height: searchIconSize,
                  }}
                />
              </button>
            </div>
          ) : (
            <div className="flex w-full min-w-0 items-center">
              {activeField && pillBounds ? (
                <ActiveSegmentPill bounds={pillBounds} roundedClass={segmentPillRounded} />
              ) : null}
              <SearchSegment
                ref={(node) => {
                  segmentRefs.current.where = node;
                }}
                field="where"
                label={whereLabel}
                value={location}
                placeholder={wherePlaceholder}
                compactPlaceholder={whereCompactPlaceholder}
                activeField={activeField}
                onActivate={activateField}
                morphProgress={segmentMorph}
              />

              <div className="bg-border mx-3 hidden h-8 w-px shrink-0 sm:block" aria-hidden />

              <SearchSegment
                ref={(node) => {
                  segmentRefs.current.when = node;
                }}
                field="when"
                label="When"
                value={dateSummary}
                placeholder="Add dates"
                compactPlaceholder="Anytime"
                activeField={activeField}
                onActivate={activateField}
                morphProgress={segmentMorph}
              />

              {showWho ? (
                <>
                  <div className="bg-border mx-3 hidden h-8 w-px shrink-0 sm:block" aria-hidden />

                  <SearchSegment
                    ref={(node) => {
                      segmentRefs.current.who = node;
                    }}
                    field="who"
                    label="Who"
                    value={guestSummary}
                    placeholder="Add guests"
                    compactPlaceholder="Add guests"
                    activeField={activeField}
                    onActivate={activateField}
                    morphProgress={segmentMorph}
                    className="max-w-[11rem] lg:max-w-none"
                  />
                </>
              ) : null}

              <button
                type="button"
                onClick={handleSearch}
                aria-label="Search"
                className={cn(
                  'bg-primary text-primary-foreground z-[2] ml-2 flex shrink-0 items-center justify-center rounded-full font-semibold shadow-md',
                  'transition-colors hover:opacity-95'
                )}
                style={{
                  width: searchButtonSize,
                  height: searchButtonSize,
                  minWidth: searchButtonSize,
                  minHeight: searchButtonSize,
                }}
              >
                <Search
                  className="shrink-0"
                  aria-hidden
                  style={{
                    width: searchIconSize,
                    height: searchIconSize,
                  }}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {activeField ? (
          <motion.div
            initial={
              hasOpenedRef.current
                ? false
                : {
                    opacity: 0,
                    left: dropdownLayout.left,
                    top: dropdownLayout.top,
                    width: dropdownLayout.width,
                    height: dropdownLayout.height,
                  }
            }
            animate={{
              opacity: 1,
              left: dropdownLayout.left,
              top: dropdownLayout.top,
              width: dropdownLayout.width,
              height: dropdownLayout.height,
            }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={PANEL_SPRING}
            onAnimationComplete={() => {
              hasOpenedRef.current = true;
            }}
            className="border-border bg-card absolute z-50 overflow-hidden rounded-3xl border shadow-xl"
          >
            <div ref={contentRef} className="min-h-0 overflow-hidden">
              <motion.div
                key={activeField}
                className="shrink-0"
                style={
                  activeField === 'when' && layoutWidth >= 640
                    ? { width: whenPanelWidth, minWidth: whenPanelWidth }
                    : undefined
                }
                initial={{ opacity: 0, x: slideDirection >= 0 ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeField === 'where' ? (
                  <div className="p-4 sm:p-5">
                    <input
                      ref={locationInputRef}
                      type="text"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      onKeyDown={onWhereKeyDown}
                      placeholder={wherePlaceholder}
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={location.trim().length >= 2}
                      aria-controls="hero-search-suggestions"
                      aria-activedescendant={
                        suggestionIndex >= 0 ? `search-suggestion-${suggestionIndex}` : undefined
                      }
                      className="text-foreground placeholder:text-muted-foreground border-border focus:ring-primary/30 mb-4 w-full rounded-xl border bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2"
                    />
                    {location.trim().length >= 2 ? (
                      <div id="hero-search-suggestions" role="listbox">
                        <SearchSuggestionPanel
                          locations={suggestionData?.locations ?? []}
                          developments={suggestionData?.developments ?? []}
                          properties={suggestionData?.properties ?? []}
                          parkings={suggestionData?.parkings ?? []}
                          isLoading={suggestionsLoading}
                          query={location}
                          activeIndex={suggestionIndex}
                          onHighlight={setSuggestionIndex}
                          onSelect={selectSuggestion}
                          onSearchAnyway={handleSearchAllResults}
                          onViewCategory={viewSuggestionCategory}
                          preferType={preferType}
                        />
                      </div>
                    ) : (
                      <SearchSuggestedEmptyPanel
                        preferType={preferType}
                        onPickNearby={pickSuggestedNearby}
                        onPickDestination={pickSuggestedDestination}
                        onPickListing={pickSuggestedListing}
                      />
                    )}
                  </div>
                ) : null}

                {activeField === 'when' ? (
                  <div className="shrink-0 overflow-hidden">
                    <div className="px-4 py-4 sm:px-5">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={effectiveCalendarMonths}
                        showOutsideDays={false}
                        navLayout="around"
                        weekStartsOn={0}
                        disabled={{ before: new Date() }}
                        className="hero-search-calendar"
                        classNames={heroSearchCalendarClassNames(effectiveCalendarMonths)}
                      />
                    </div>
                    <div className="border-border flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
                      <button
                        type="button"
                        onClick={() => setDateRange(undefined)}
                        className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
                      >
                        Clear dates
                      </button>
                      <button
                        type="button"
                        onClick={() => (showWho ? setActiveField('who') : handleSearch())}
                        className="bg-primary text-primary-foreground min-h-[44px] rounded-full px-5 text-sm font-semibold"
                      >
                        {showWho ? 'Next' : 'Search'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {activeField === 'who' && showWho ? (
                  <div className="divide-border divide-y px-5 pb-2">
                    <GuestRow
                      label="Adults"
                      subtitle="Ages 13 or above"
                      value={guests.adults}
                      min={1}
                      onDecrement={() => updateGuest('adults', -1)}
                      onIncrement={() => updateGuest('adults', 1)}
                    />
                    <GuestRow
                      label="Children"
                      subtitle="Ages 2 – 12"
                      value={guests.children}
                      onDecrement={() => updateGuest('children', -1)}
                      onIncrement={() => updateGuest('children', 1)}
                    />
                    <GuestRow
                      label="Pets"
                      value={guests.pets}
                      onDecrement={() => updateGuest('pets', -1)}
                      onIncrement={() => updateGuest('pets', 1)}
                    />
                  </div>
                ) : null}
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
