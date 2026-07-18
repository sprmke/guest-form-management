import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

export const SLIDING_PILL_SPRING = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 38,
  mass: 0.82,
};

export type SlidingPillBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function pillBoundsEqual(a: SlidingPillBounds | null, b: SlidingPillBounds): boolean {
  if (!a) return false;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

/** Avoid setState when layout is unchanged — prevents observer/layout effect loops. */
export function commitSlidingPillBounds(
  setBounds: Dispatch<SetStateAction<SlidingPillBounds | null>>,
  next: SlidingPillBounds
) {
  setBounds((prev) => (pillBoundsEqual(prev, next) ? prev : next));
}

function measureElementBounds(container: HTMLElement, item: HTMLElement): SlidingPillBounds {
  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  return {
    left: Math.round(itemRect.left - containerRect.left),
    top: Math.round(itemRect.top - containerRect.top),
    width: Math.round(itemRect.width),
    height: Math.round(itemRect.height),
  };
}

/** Coalesce observer/layout callbacks to one measure per animation frame. */
function useRafMeasure(measure: () => void) {
  const measureRef = useRef(measure);
  measureRef.current = measure;

  const rafIdRef = useRef<number | null>(null);

  const schedule = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      measureRef.current();
    });
  }, []);

  const cancel = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  return { schedule, cancel, flush: measure };
}

const EMPTY_REMEASURE_DEPS: unknown[] = [];

export function useSlidingActivePill(
  activeKey: string | null | undefined,
  remeasureDeps: unknown[] = EMPTY_REMEASURE_DEPS
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;

  const [bounds, setBounds] = useState<SlidingPillBounds | null>(null);

  const measure = useCallback(() => {
    if (!activeKey || !containerRef.current) return;

    const item = itemRefs.current[activeKey];
    if (!item) return;

    commitSlidingPillBounds(setBounds, measureElementBounds(containerRef.current, item));
  }, [activeKey]);

  const { schedule, cancel } = useRafMeasure(measure);
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;

  const setItemRef = useCallback(
    (key: string) => (node: HTMLElement | null) => {
      itemRefs.current[key] = node;
      if (node && key === activeKeyRef.current) {
        scheduleRef.current();
      }
    },
    []
  );

  useLayoutEffect(() => {
    if (!activeKey) {
      setBounds((prev) => (prev === null ? prev : null));
      return;
    }

    // RAF after paint so Framer Motion can interpolate from the previous frame.
    schedule();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remeasureDeps are intentional layout triggers
  }, [activeKey, schedule, cancel, ...remeasureDeps]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      schedule();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [schedule]);

  return { containerRef, setItemRef, bounds };
}

/** Measures the active `[data-state="active"]` child — for Radix TabsList. */
export function useDomActiveSlidingPill(activeSelector = '[data-state="active"]') {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<SlidingPillBounds | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const active = container.querySelector<HTMLElement>(activeSelector);
    if (!active) return;

    commitSlidingPillBounds(setBounds, measureElementBounds(container, active));
  }, [activeSelector]);

  const { schedule, cancel, flush } = useRafMeasure(measure);

  useLayoutEffect(() => {
    schedule();
    return cancel;
  }, [schedule, cancel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      schedule();
    });
    resizeObserver.observe(container);

    const mutationObserver = new MutationObserver((mutations) => {
      const stateChanged = mutations.some(
        (mutation) => mutation.type === 'attributes' && mutation.attributeName === 'data-state'
      );
      if (stateChanged) flush();
      schedule();
    });
    mutationObserver.observe(container, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [flush, schedule]);

  return { containerRef, bounds };
}
