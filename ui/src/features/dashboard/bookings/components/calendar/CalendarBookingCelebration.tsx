import { useEffect, useMemo, useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { createPortal } from 'react-dom';

const CONFETTI_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const PIECE_COUNT = 28;
const VISIBLE_MS = 2600;

type ConfettiPiece = {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  size: number;
  rounded: boolean;
};

function buildPieces(): ConfettiPiece[] {
  return Array.from({ length: PIECE_COUNT }, (_, id) => ({
    id,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[id % CONFETTI_COLORS.length],
    delay: Math.random() * 0.35,
    duration: 1.8 + Math.random() * 1,
    drift: (Math.random() - 0.5) * 80,
    size: 6 + Math.random() * 5,
    rounded: id % 2 === 0,
  }));
}

export type CalendarBookingCelebrationTrigger = {
  /** Unique per occurrence (e.g. `${year}-${month}`) so repeated triggers replay cleanly. */
  key: string;
  count: number;
  /** What `count` measures, shown in the badge (e.g. "bookings", "days booked"). */
  unitLabel?: string;
  /** Every day in the month is booked — swaps in "fully booked" copy. */
  fullyBooked?: boolean;
};

type Props = {
  trigger: CalendarBookingCelebrationTrigger | null;
  onDone?: () => void;
};

/**
 * Brief full-screen confetti + badge, shown when a viewed month crosses the
 * "busy month" booking threshold. Auto-dismisses; purely decorative
 * (pointer-events-none) so it never blocks calendar interaction.
 */
export function CalendarBookingCelebration({ trigger, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const pieces = useMemo(() => (trigger ? buildPieces() : []), [trigger]);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const timeout = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, VISIBLE_MS);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger?.key]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {visible && trigger ? (
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden>
          {!reduceMotion &&
            pieces.map((piece) => (
              <motion.span
                key={piece.id}
                className={piece.rounded ? 'absolute rounded-full' : 'absolute rounded-[1px]'}
                style={{
                  left: `${piece.left}%`,
                  width: piece.size,
                  height: piece.size,
                  backgroundColor: piece.color,
                  top: '-5%',
                }}
                initial={{ y: '-10vh', x: 0, opacity: 0, rotate: 0 }}
                animate={{
                  y: '110vh',
                  x: piece.drift,
                  opacity: [0, 1, 1, 0],
                  rotate: 360,
                }}
                transition={{
                  duration: piece.duration,
                  delay: piece.delay,
                  ease: 'easeIn',
                }}
              />
            ))}

          <motion.div
            className="absolute inset-x-0 top-6 flex justify-center px-4 sm:top-10"
            initial={{ opacity: 0, y: reduceMotion ? 0 : -8, scale: reduceMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="border-border/60 bg-card/95 flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-lg backdrop-blur">
              <PartyPopper className="size-6 shrink-0 text-[hsl(var(--chart-3))]" aria-hidden />
              <div className="flex flex-col">
                <span className="text-foreground text-base font-semibold leading-tight">
                  {trigger.fullyBooked ? 'Fully booked — congrats!' : 'Amazing month, keep it up!'}
                </span>
                <span className="text-muted-foreground text-sm leading-tight">
                  {trigger.count} {trigger.unitLabel ?? 'bookings'} so far this month
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
