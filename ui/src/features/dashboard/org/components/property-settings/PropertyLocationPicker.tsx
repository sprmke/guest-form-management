import { useCallback, useEffect, useRef } from 'react';

import { Check, Copy, ExternalLink, MapPin } from 'lucide-react';
import { toast } from 'sonner';

import { RequiredMark } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { useGoogleMapsLoader } from '@/features/dashboard/org/hooks/useGoogleMapsLoader';
import {
  DEFAULT_PROPERTY_MAP_CENTER,
  buildGoogleMapsUrl,
  locationFromGeocoderResult,
  locationFromPlace,
  type PropertyLocationFields,
} from '@/features/dashboard/org/lib/propertyLocation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PropertyLocationPickerProps = {
  value: PropertyLocationFields;
  disabled?: boolean;
  onChange: (patch: Partial<PropertyLocationFields>) => void;
  addressError?: string | null;
  mapError?: string | null;
  onFieldInteract?: (fieldId: string) => void;
};

function locationMetaLine(value: PropertyLocationFields): string | null {
  const parts = [value.city, value.province, value.country].filter(
    (part) => part.trim().length > 0
  );
  if (parts.length === 0) return null;
  return parts.join(', ');
}

function resolvedMapsUrl(value: PropertyLocationFields): string | null {
  if (value.mapsUrl.trim()) return value.mapsUrl.trim();
  if (value.latitude == null || value.longitude == null) return null;
  return buildGoogleMapsUrl(value.latitude, value.longitude, value.placeId);
}

function hasPinnedLocation(value: PropertyLocationFields): boolean {
  return value.latitude != null && value.longitude != null;
}

export function PropertyLocationPicker({
  value,
  disabled = false,
  onChange,
  addressError = null,
  mapError = null,
  onFieldInteract,
}: PropertyLocationPickerProps) {
  const { ready, error, apiKeyConfigured } = useGoogleMapsLoader();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const initialGeocodeDoneRef = useRef(false);
  const skipInputSyncRef = useRef(false);

  const applyLocation = useCallback(
    (patch: Partial<PropertyLocationFields>) => {
      if ('address' in patch) onFieldInteract?.('property-address');
      if ('latitude' in patch || 'longitude' in patch) {
        onFieldInteract?.('property-location-map');
      }
      onChange(patch);
    },
    [onChange, onFieldInteract]
  );

  const syncMarkerAndMap = useCallback((latitude: number, longitude: number) => {
    const position = { lat: latitude, lng: longitude };
    markerRef.current?.setPosition(position);
    mapRef.current?.panTo(position);
    mapRef.current?.setZoom(16);
  }, []);

  const reverseGeocode = useCallback(
    (latLng: google.maps.LatLng) => {
      if (!geocoderRef.current) return;

      geocoderRef.current.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const location = locationFromGeocoderResult(results[0]);
          if (!location) return;
          skipInputSyncRef.current = true;
          applyLocation(location);
          if (inputRef.current) {
            inputRef.current.value = location.address;
          }
          return;
        }

        const latitude = latLng.lat();
        const longitude = latLng.lng();
        applyLocation({
          latitude,
          longitude,
          mapsUrl: buildGoogleMapsUrl(latitude, longitude),
        });
      });
    },
    [applyLocation]
  );

  const geocodeAddress = useCallback(
    (address: string) => {
      const trimmed = address.trim();
      if (!trimmed || !geocoderRef.current) return;

      geocoderRef.current.geocode({ address: trimmed, region: 'ph' }, (results, status) => {
        if (status !== 'OK' || !results?.[0]) return;
        const location = locationFromGeocoderResult(results[0]);
        if (!location?.latitude || location.longitude == null) return;
        skipInputSyncRef.current = true;
        applyLocation(location);
        if (inputRef.current) {
          inputRef.current.value = location.address;
        }
        syncMarkerAndMap(location.latitude, location.longitude);
      });
    },
    [applyLocation, syncMarkerAndMap]
  );

  useEffect(() => {
    if (!ready || !mapContainerRef.current || mapRef.current) return;

    const latitude = value.latitude ?? DEFAULT_PROPERTY_MAP_CENTER.lat;
    const longitude = value.longitude ?? DEFAULT_PROPERTY_MAP_CENTER.lng;

    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat: latitude, lng: longitude },
      zoom: value.latitude != null ? 16 : 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: disabled ? 'none' : 'greedy',
    });

    const marker = new google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map,
      draggable: !disabled,
    });

    geocoderRef.current = new google.maps.Geocoder();

    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) reverseGeocode(position);
    });

    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (disabled || !event.latLng) return;
      marker.setPosition(event.latLng);
      reverseGeocode(event.latLng);
    });

    mapRef.current = map;
    markerRef.current = marker;
  }, [disabled, ready, reverseGeocode, value.latitude, value.longitude]);

  useEffect(() => {
    if (!ready || !mapRef.current || !markerRef.current) return;
    if (value.latitude == null || value.longitude == null) return;

    const position = { lat: value.latitude, lng: value.longitude };
    markerRef.current.setPosition(position);
    mapRef.current.panTo(position);
  }, [ready, value.latitude, value.longitude]);

  useEffect(() => {
    if (!ready || !inputRef.current || disabled) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'place_id', 'address_components'],
      componentRestrictions: { country: 'ph' },
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const location = locationFromPlace(place);
      if (!location?.latitude || location.longitude == null) return;

      skipInputSyncRef.current = true;
      applyLocation(location);
      if (inputRef.current) {
        inputRef.current.value = location.address;
      }
      syncMarkerAndMap(location.latitude, location.longitude);
    });

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [applyLocation, disabled, ready, syncMarkerAndMap]);

  useEffect(() => {
    if (!ready || initialGeocodeDoneRef.current) return;
    if (value.latitude != null && value.longitude != null) {
      initialGeocodeDoneRef.current = true;
      return;
    }
    if (!value.address.trim()) return;

    initialGeocodeDoneRef.current = true;
    geocodeAddress(value.address);
  }, [geocodeAddress, ready, value.address, value.latitude, value.longitude]);

  useEffect(() => {
    if (!inputRef.current) return;
    if (skipInputSyncRef.current) {
      skipInputSyncRef.current = false;
      return;
    }
    if (inputRef.current.value !== value.address) {
      inputRef.current.value = value.address;
    }
  }, [value.address]);

  const handleAddressBlur = () => {
    onFieldInteract?.('property-address');
    const nextAddress = inputRef.current?.value.trim() ?? '';
    if (nextAddress === value.address.trim()) return;
    applyLocation({ address: nextAddress });
    if (apiKeyConfigured && ready) {
      geocodeAddress(nextAddress);
    }
  };

  const handleCopyMapsLink = async () => {
    const link = resolvedMapsUrl(value);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Maps link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const mapsUnavailable = !apiKeyConfigured || Boolean(error);
  const mapsUrl = resolvedMapsUrl(value);
  const pinned = hasPinnedLocation(value);
  const metaLine = locationMetaLine(value);
  const displayAddress = value.address.trim() || 'Pinned location';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="property-location-search" className="text-sm font-medium">
          Address
          <RequiredMark />
        </label>
        <Input
          id="property-location-search"
          ref={inputRef}
          defaultValue={value.address}
          disabled={disabled}
          placeholder="Search or enter property address"
          autoComplete="off"
          onInput={() => onFieldInteract?.('property-address')}
          onBlur={handleAddressBlur}
          aria-invalid={Boolean(addressError)}
          className={cn('min-h-[44px]', addressError && 'border-destructive')}
        />
        {addressError ? (
          <p className="text-destructive text-xs">{addressError}</p>
        ) : mapsUnavailable ? (
          <p className="text-muted-foreground text-xs">
            {error ??
              'Map picker requires VITE_GOOGLE_MAPS_API_KEY (Maps JavaScript + Places APIs).'}
          </p>
        ) : null}
      </div>

      {apiKeyConfigured ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Map pin
            <RequiredMark />
          </p>
          <div
            className={cn(
              'bg-muted/20 relative aspect-video w-full overflow-hidden rounded-lg border',
              !ready && 'animate-pulse',
              mapError && 'border-destructive'
            )}
          >
            <div ref={mapContainerRef} className="absolute inset-0 size-full" />
            {!ready && !error ? (
              <div className="bg-muted/40 absolute inset-0 flex items-center justify-center">
                <MapPin className="text-muted-foreground size-8" aria-hidden />
              </div>
            ) : null}
          </div>
          {mapError ? <p className="text-destructive text-xs">{mapError}</p> : null}
        </div>
      ) : null}

      {pinned && mapsUrl ? (
        <div className="bg-card rounded-xl border p-3 sm:p-4">
          <div className="flex gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            >
              <Check className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium leading-snug">{displayAddress}</p>
              {metaLine && metaLine !== displayAddress ? (
                <p className="text-muted-foreground text-xs">{metaLine}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="min-h-[44px] w-full justify-center gap-2"
              asChild
            >
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4 shrink-0" aria-hidden />
                Open in Google Maps
              </a>
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              className="min-h-[44px] w-full justify-center gap-2"
              onClick={() => void handleCopyMapsLink()}
            >
              <Copy className="size-4 shrink-0" aria-hidden />
              Copy link
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
