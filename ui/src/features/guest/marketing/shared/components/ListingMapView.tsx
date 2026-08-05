import { useEffect, useRef, useState } from 'react';

import { Link } from 'react-router-dom';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MapPin, Minus, Plus, Star, X } from 'lucide-react';

import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';
import {
  formatMapPinLabel,
  type ListingMapMarker,
  type MapBbox,
} from '@/features/guest/marketing/shared/lib/listingMapMarkers';
import { resolveListingCoverImage } from '@/features/guest/marketing/shared/lib/mockListingImages';
import {
  listingMapCanvasClass,
  listingMapMinHeightClass,
} from '@/features/guest/marketing/shared/lib/listingMapLayout';
import { useGoogleMapsLoader } from '@/lib/google-maps/useGoogleMapsLoader';
import { cn } from '@/lib/utils';

type ListingMapViewProps = {
  markers: ListingMapMarker[];
  /** Total matching in current mode (may exceed markers.length when capped). */
  totalInView: number;
  nounSingular: string;
  nounPlural: string;
  className?: string;
  /**
   * Called when the map settles after pan/zoom (debounced idle).
   * Writes viewport bounds so the parent can refetch in-bounds listings.
   */
  onViewportChange?: (bbox: MapBbox) => void;
};

type PinOverlay = {
  marker: ListingMapMarker;
  overlay: google.maps.OverlayView;
  el: HTMLButtonElement;
};

const PH_DEFAULT_CENTER = { lat: 12.8797, lng: 121.774 };
const CLUSTER_PIXEL = 48;
const VIEWPORT_IDLE_MS = 400;

function readBounds(map: google.maps.Map): MapBbox | null {
  const b = map.getBounds();
  if (!b) return null;
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  return {
    swLat: sw.lat(),
    swLng: sw.lng(),
    neLat: ne.lat(),
    neLng: ne.lng(),
  };
}

function bboxKey(bbox: MapBbox): string {
  return [bbox.swLat, bbox.swLng, bbox.neLat, bbox.neLng].map((n) => n.toFixed(5)).join(',');
}

function clusterMarkers(
  markers: ListingMapMarker[],
  projection: google.maps.MapCanvasProjection,
  zoom: number
): Array<{ markers: ListingMapMarker[]; lat: number; lng: number }> {
  if (zoom >= 14 || markers.length <= 12) {
    return markers.map((m) => ({ markers: [m], lat: m.latitude, lng: m.longitude }));
  }

  const cell = CLUSTER_PIXEL * (zoom < 10 ? 2 : 1);
  const buckets = new Map<string, ListingMapMarker[]>();

  for (const marker of markers) {
    const point = projection.fromLatLngToDivPixel(
      new google.maps.LatLng(marker.latitude, marker.longitude)
    );
    if (!point) {
      const key = `${marker.id}`;
      buckets.set(key, [marker]);
      continue;
    }
    const key = `${Math.floor(point.x / cell)}:${Math.floor(point.y / cell)}`;
    const list = buckets.get(key);
    if (list) list.push(marker);
    else buckets.set(key, [marker]);
  }

  const clusters: Array<{ markers: ListingMapMarker[]; lat: number; lng: number }> = [];
  for (const group of buckets.values()) {
    const lat = group.reduce((s, m) => s + m.latitude, 0) / group.length;
    const lng = group.reduce((s, m) => s + m.longitude, 0) / group.length;
    clusters.push({ markers: group, lat, lng });
  }
  return clusters;
}

export function ListingMapView({
  markers,
  totalInView,
  nounSingular,
  nounPlural,
  className,
  onViewportChange,
}: ListingMapViewProps) {
  const { ready, error, apiKeyConfigured } = useGoogleMapsLoader();
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<PinOverlay[]>([]);
  const clusterOverlaysRef = useRef<google.maps.OverlayView[]>([]);
  const [selected, setSelected] = useState<ListingMapMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  /** Skip idle emissions caused by programmatic fitBounds / setCenter. */
  const suppressUntilRef = useRef(0);
  /** After the guest pans/zooms, never re-fitBounds when marker sets refresh. */
  const userNavigatedRef = useRef(false);
  const fittedKeyRef = useRef('');
  const lastEmittedBboxRef = useRef('');
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const noun = totalInView === 1 ? nounSingular : nounPlural;
  const locatedCount = markers.length;

  const suppressProgrammaticIdle = (ms = 600) => {
    suppressUntilRef.current = Date.now() + ms;
  };

  /** After fitBounds settles, sync URL bbox once so filters/facets match the visible map. */
  const emitViewportAfterFit = (map: google.maps.Map, delayMs = 650) => {
    suppressProgrammaticIdle(delayMs);
    window.setTimeout(() => {
      const callback = onViewportChangeRef.current;
      if (!callback) return;
      const bbox = readBounds(map);
      if (!bbox) return;
      const key = bboxKey(bbox);
      if (key === lastEmittedBboxRef.current) return;
      lastEmittedBboxRef.current = key;
      userNavigatedRef.current = true;
      callback(bbox);
    }, delayMs + 50);
  };

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;

    const map = new google.maps.Map(containerRef.current, {
      center: PH_DEFAULT_CENTER,
      zoom: 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: 'greedy',
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });
    mapRef.current = map;
    setMapReady(true);
    suppressProgrammaticIdle(800);

    let idleTimer: number | undefined;

    const onIdle = () => {
      if (Date.now() < suppressUntilRef.current) return;

      const callback = onViewportChangeRef.current;
      if (!callback) return;

      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        if (Date.now() < suppressUntilRef.current) return;
        const bbox = readBounds(map);
        if (!bbox) return;
        const key = bboxKey(bbox);
        if (key === lastEmittedBboxRef.current) return;
        lastEmittedBboxRef.current = key;
        userNavigatedRef.current = true;
        setSelected(null);
        callback(bbox);
      }, VIEWPORT_IDLE_MS);
    };

    const idleListener = map.addListener('idle', onIdle);

    return () => {
      window.clearTimeout(idleTimer);
      google.maps.event.removeListener(idleListener);
      google.maps.event.clearInstanceListeners(map);
      mapRef.current = null;
      setMapReady(false);
    };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    for (const entry of overlaysRef.current) {
      entry.overlay.setMap(null);
    }
    overlaysRef.current = [];
    for (const overlay of clusterOverlaysRef.current) {
      overlay.setMap(null);
    }
    clusterOverlaysRef.current = [];

    const projectionReady = () => {
      const overlay = new google.maps.OverlayView();
      overlay.onAdd = () => undefined;
      overlay.draw = () => undefined;
      overlay.onRemove = () => undefined;
      overlay.setMap(map);
      return overlay;
    };

    const probe = projectionReady();

    const paint = () => {
      const projection = probe.getProjection();
      if (!projection) {
        requestAnimationFrame(paint);
        return;
      }

      const zoom = map.getZoom() ?? 10;
      const clusters = clusterMarkers(markers, projection, zoom);

      for (const cluster of clusters) {
        if (cluster.markers.length === 1) {
          const marker = cluster.markers[0]!;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = cn(
            'listing-map-pin absolute -translate-x-1/2 -translate-y-full cursor-pointer',
            'border-border bg-background rounded-full border px-2.5 py-1.5 text-sm font-semibold shadow-md',
            'text-foreground transition-transform hover:scale-105',
            'focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2'
          );
          btn.textContent = formatMapPinLabel(marker.price, marker.name);
          btn.setAttribute('aria-label', marker.name);
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelected(marker);
            btn.classList.add('bg-primary', 'text-primary-foreground', 'border-primary');
          });

          const pinOverlay = new google.maps.OverlayView();
          pinOverlay.onAdd = function onAdd() {
            const panes = this.getPanes();
            panes?.overlayMouseTarget.appendChild(btn);
          };
          pinOverlay.draw = function draw() {
            const proj = this.getProjection();
            if (!proj) return;
            const point = proj.fromLatLngToDivPixel(
              new google.maps.LatLng(marker.latitude, marker.longitude)
            );
            if (!point) return;
            btn.style.left = `${point.x}px`;
            btn.style.top = `${point.y}px`;
          };
          pinOverlay.onRemove = function onRemove() {
            btn.remove();
          };
          pinOverlay.setMap(map);
          overlaysRef.current.push({ marker, overlay: pinOverlay, el: btn });
        } else {
          const count = cluster.markers.length;
          const el = document.createElement('button');
          el.type = 'button';
          el.className = cn(
            'absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center',
            'border-border bg-primary text-primary-foreground rounded-full border text-sm font-bold shadow-md',
            'focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2'
          );
          el.textContent = String(count);
          el.setAttribute('aria-label', `${count} listings`);
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            suppressProgrammaticIdle();
            map.setCenter({ lat: cluster.lat, lng: cluster.lng });
            map.setZoom(Math.min((map.getZoom() ?? 10) + 2, 16));
          });

          const clusterOverlay = new google.maps.OverlayView();
          clusterOverlay.onAdd = function onAdd() {
            this.getPanes()?.overlayMouseTarget.appendChild(el);
          };
          clusterOverlay.draw = function draw() {
            const proj = this.getProjection();
            if (!proj) return;
            const point = proj.fromLatLngToDivPixel(
              new google.maps.LatLng(cluster.lat, cluster.lng)
            );
            if (!point) return;
            el.style.left = `${point.x}px`;
            el.style.top = `${point.y}px`;
          };
          clusterOverlay.onRemove = function onRemove() {
            el.remove();
          };
          clusterOverlay.setMap(map);
          clusterOverlaysRef.current.push(clusterOverlay);
        }
      }

      probe.setMap(null);

      const fitKey = markers.map((m) => m.id).join(',');
      if (!userNavigatedRef.current && fitKey !== fittedKeyRef.current && markers.length > 0) {
        fittedKeyRef.current = fitKey;
        suppressProgrammaticIdle();
        const bounds = new google.maps.LatLngBounds();
        for (const m of markers) {
          bounds.extend({ lat: m.latitude, lng: m.longitude });
        }
        map.fitBounds(bounds, 64);
        if (markers.length === 1) {
          map.setZoom(14);
        }
        emitViewportAfterFit(map);
      } else if (
        !userNavigatedRef.current &&
        markers.length === 0 &&
        fitKey !== fittedKeyRef.current
      ) {
        fittedKeyRef.current = fitKey;
        suppressProgrammaticIdle();
        map.setCenter(PH_DEFAULT_CENTER);
        map.setZoom(6);
        emitViewportAfterFit(map);
      } else {
        fittedKeyRef.current = fitKey;
      }
    };

    paint();
  }, [markers, mapReady]);

  useEffect(() => {
    for (const entry of overlaysRef.current) {
      const active = selected?.id === entry.marker.id;
      entry.el.classList.toggle('bg-primary', active);
      entry.el.classList.toggle('text-primary-foreground', active);
      entry.el.classList.toggle('border-primary', active);
    }
  }, [selected]);

  const zoomBy = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    const zoom = map.getZoom() ?? 10;
    map.setZoom(zoom + delta);
  };

  if (!apiKeyConfigured || error) {
    return (
      <div
        className={cn(
          'border-border bg-muted flex w-full items-center justify-center rounded-2xl border p-6 text-center',
          listingMapMinHeightClass,
          className
        )}
      >
        <p className="text-muted-foreground text-sm">
          {error ?? 'Add VITE_GOOGLE_MAPS_API_KEY to enable map view.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-border bg-muted relative overflow-hidden rounded-2xl border',
        listingMapCanvasClass,
        className
      )}
    >
      <div ref={containerRef} className="absolute inset-0" role="presentation" />

      {!ready && (
        <div className="bg-muted/80 absolute inset-0 z-10 flex items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      )}

      <div className="border-border bg-background/95 absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-md backdrop-blur-sm sm:left-4 sm:top-4">
        <MapPin className="text-primary h-4 w-4 shrink-0" aria-hidden />
        <span className="text-foreground font-medium tabular-nums">
          {locatedCount}
          {totalInView > locatedCount ? `/${totalInView}` : ''} {noun}
        </span>
      </div>

      <div className="border-border bg-background absolute right-3 top-3 z-20 flex flex-col overflow-hidden rounded-lg border shadow-md sm:right-4 sm:top-4">
        <button
          type="button"
          className="hover:bg-muted flex min-h-[44px] min-w-[44px] items-center justify-center"
          aria-label="Zoom in"
          onClick={() => zoomBy(1)}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
        <div className="bg-border h-px" />
        <button
          type="button"
          className="hover:bg-muted flex min-h-[44px] min-w-[44px] items-center justify-center"
          aria-label="Zoom out"
          onClick={() => zoomBy(-1)}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <AnimatePresence>
        {selected ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 16 }}
            className="absolute bottom-3 left-3 right-3 z-30 sm:bottom-4 sm:left-auto sm:right-4 sm:w-80"
          >
            <div className="border-border bg-card overflow-hidden rounded-xl border shadow-xl">
              <div className="relative aspect-[16/10]">
                <Image
                  src={resolveListingCoverImage(
                    selected.images,
                    selected.images?.[0],
                    selected.family,
                    selected.slug
                  )}
                  alt={selected.name}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-slate-900" aria-hidden />
                </button>
              </div>
              <Link to={selected.href as never} className="block p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h4 className="text-foreground line-clamp-1 font-semibold">{selected.name}</h4>
                  {selected.rating != null && selected.rating > 0 ? (
                    <div className="flex shrink-0 items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                      <span className="font-medium tabular-nums">{selected.rating.toFixed(1)}</span>
                    </div>
                  ) : null}
                </div>
                <p className="text-muted-foreground mb-2 line-clamp-1 text-sm">
                  {selected.location}
                </p>
                {selected.price != null ? (
                  <div>
                    <span className="text-foreground font-bold tabular-nums">
                      ₱{selected.price.toLocaleString()}
                    </span>
                    {selected.family === 'property' || selected.family === 'parking' ? (
                      <span className="text-muted-foreground text-sm"> / night</span>
                    ) : null}
                  </div>
                ) : null}
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
