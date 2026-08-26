import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';


import { DismissableLayerBranch } from '@radix-ui/react-dismissable-layer';
import { MapPin } from 'lucide-react';
import { createPortal } from 'react-dom';

import { Input } from '@/components/ui/input';
import { locationLabelFromPlace } from '@/lib/google-maps/locationLabel';
import { useGoogleMapsLoader } from '@/lib/google-maps/useGoogleMapsLoader';
import { cn } from '@/lib/utils';

type LocationSearchInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string | null;
  className?: string;
};

type Suggestion = {
  placeId: string;
  primary: string;
  secondary: string;
};

type ListPosition = {
  bottom: number;
  left: number;
  width: number;
};

export function LocationSearchInput({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = 'Search location',
  error = null,
  className,
}: LocationSearchInputProps) {
  const listId = useId();
  const [mapsEnabled, setMapsEnabled] = useState(false);
  const {
    ready,
    error: mapsError,
    apiKeyConfigured,
  } = useGoogleMapsLoader({
    enabled: mapsEnabled,
  });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const rootRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<number | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const pendingQueryRef = useRef<string | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listPosition, setListPosition] = useState<ListPosition | null>(null);

  const ensureSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, []);

  const resetSessionToken = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  const closeSuggestions = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setSuggestions([]);
    setListPosition(null);
  }, []);

  const updateListPosition = useCallback(() => {
    const rect = inputWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setListPosition({
      bottom: window.innerHeight - rect.top + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const fetchSuggestions = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!ready || !apiKeyConfigured || trimmed.length < 2) {
        setSuggestions([]);
        setOpen(false);
        setListPosition(null);
        return;
      }

      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: trimmed,
          componentRestrictions: { country: 'ph' },
          sessionToken: ensureSessionToken(),
        },
        (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions?.length) {
            setSuggestions([]);
            setOpen(false);
            setListPosition(null);
            return;
          }

          setSuggestions(
            predictions.slice(0, 6).map((prediction) => ({
              placeId: prediction.place_id,
              primary: prediction.structured_formatting.main_text,
              secondary: prediction.structured_formatting.secondary_text || '',
            }))
          );
          setOpen(true);
          setActiveIndex(-1);
          updateListPosition();
        }
      );
    },
    [apiKeyConfigured, ensureSessionToken, ready, updateListPosition]
  );

  const scheduleFetch = useCallback(
    (input: string) => {
      if (!mapsEnabled) {
        pendingQueryRef.current = input;
        setMapsEnabled(true);
        return;
      }
      if (!ready) {
        pendingQueryRef.current = input;
        return;
      }
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => fetchSuggestions(input), 220);
    },
    [fetchSuggestions, mapsEnabled, ready]
  );

  useEffect(() => {
    if (!ready || pendingQueryRef.current == null) return;
    const pending = pendingQueryRef.current;
    pendingQueryRef.current = null;
    fetchSuggestions(pending);
  }, [fetchSuggestions, ready]);

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateListPosition();
    const onReposition = () => updateListPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updateListPosition]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      closeSuggestions();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [closeSuggestions]);

  /**
   * Dialog sets `body { pointer-events: none }` and remove-scroll cancels wheel outside
   * the dialog shard. Re-enable pointer events via DismissableLayerBranch + drive scroll.
   */
  useLayoutEffect(() => {
    if (!open || suggestions.length === 0 || !listPosition) return;

    const el = listRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (!el.contains(event.target as Node)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      el.scrollTop += event.deltaY;
    };

    let lastY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      lastY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!el.contains(event.target as Node) || lastY == null) return;
      const y = event.touches[0]?.clientY;
      if (y == null) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      el.scrollTop += lastY - y;
      lastY = y;
    };

    // Capture on the list *and* document so we win over remove-scroll's document listener.
    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    document.addEventListener('wheel', onWheel, { passive: false, capture: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    return () => {
      el.removeEventListener('wheel', onWheel, true);
      document.removeEventListener('wheel', onWheel, true);
      el.removeEventListener('touchstart', onTouchStart, true);
      el.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('touchmove', onTouchMove, true);
    };
  }, [listPosition, open, suggestions.length]);

  const selectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (!ready) return;

      const detailHost = document.createElement('div');
      const places = new google.maps.places.PlacesService(detailHost);
      places.getDetails(
        {
          placeId: suggestion.placeId,
          fields: ['formatted_address', 'address_components'],
          sessionToken: ensureSessionToken(),
        },
        (place, status) => {
          resetSessionToken();
          closeSuggestions();

          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            const label = locationLabelFromPlace(place);
            if (label) {
              onChangeRef.current(label);
              return;
            }
          }

          const fallback = [suggestion.primary, suggestion.secondary]
            .filter(Boolean)
            .join(', ')
            .slice(0, 120);
          onChangeRef.current(fallback);
        }
      );
    },
    [closeSuggestions, ensureSessionToken, ready, resetSessionToken]
  );

  const handleInputChange = (next: string) => {
    onChangeRef.current(next);
    scheduleFetch(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (event.key === 'Escape') closeSuggestions();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const suggestion = suggestions[activeIndex];
      if (suggestion) selectSuggestion(suggestion);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSuggestions();
    }
  };

  const showList = open && suggestions.length > 0 && listPosition != null;

  return (
    <div ref={rootRef} className="relative">
      <div ref={inputWrapRef} className="relative">
        <MapPin
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          id={id}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={120}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            setMapsEnabled(true);
            if (value.trim().length >= 2) scheduleFetch(value);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              const active = document.activeElement;
              if (rootRef.current?.contains(active) || listRef.current?.contains(active)) {
                return;
              }
              onChangeRef.current(value.trim());
            }, 120);
          }}
          onKeyDown={handleKeyDown}
          className={cn('h-10 pl-10', error && 'border-destructive', className)}
          aria-invalid={Boolean(error)}
        />
      </div>

      {showList && listPosition
        ? createPortal(
            <DismissableLayerBranch
              data-kame-location-suggestions=""
              style={{
                position: 'fixed',
                bottom: listPosition.bottom,
                left: listPosition.left,
                width: listPosition.width,
                zIndex: 220,
                pointerEvents: 'auto',
              }}
              className="border-border/50 bg-popover text-popover-foreground max-h-60 overflow-hidden rounded-xl border shadow-[0_8px_24px_-8px_hsl(var(--shadow-color)/0.18)]"
            >
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                className="max-h-60 overflow-y-auto overscroll-contain py-1 [-webkit-overflow-scrolling:touch]"
              >
                {suggestions.map((suggestion, index) => {
                  const active = index === activeIndex;
                  return (
                    <li key={suggestion.placeId} role="presentation">
                      <button
                        type="button"
                        id={`${listId}-option-${index}`}
                        role="option"
                        aria-selected={active}
                        className={cn(
                          'hover:bg-accent flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors',
                          active && 'bg-accent'
                        )}
                        onPointerDown={(event) => {
                          // Keep input focus; select immediately on pointer down so Dialog
                          // dismiss / blur cannot cancel the choice.
                          event.preventDefault();
                          event.stopPropagation();
                          selectSuggestion(suggestion);
                        }}
                      >
                        <span className="text-foreground text-sm font-medium leading-snug">
                          {suggestion.primary}
                        </span>
                        {suggestion.secondary ? (
                          <span className="text-muted-foreground text-xs font-normal leading-snug">
                            {suggestion.secondary}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </DismissableLayerBranch>,
            document.body
          )
        : null}

      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error}
        </p>
      ) : mapsEnabled && (!apiKeyConfigured || mapsError) ? (
        <p className="text-muted-foreground mt-2 text-xs">
          {mapsError ??
            'Location search requires VITE_GOOGLE_MAPS_API_KEY (Maps JavaScript + Places APIs).'}
        </p>
      ) : null}
    </div>
  );
}
