import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, DoorOpen, LogOut } from 'lucide-react';

import type { GuestStayGuideDto } from '@/features/guest/stay-guide/lib/api';

import { cn } from '@/lib/utils';
import { formatStayBoundaryDateShort, formatTimeToAMPM } from '@/utils/format/dates';

interface StayPassCardProps {
  guide: GuestStayGuideDto;
  /** When true (default), pull up to overlap the hero. When false, use normal top spacing. */
  overlapHero?: boolean;
}

function StayPassField({
  icon: Icon,
  label,
  date,
  time,
}: {
  icon: typeof DoorOpen;
  label: string;
  date: string;
  time: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-primary flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]">
        <Icon className="size-3" aria-hidden />
        {label}
      </span>
      <span className="font-fraunces @2xl:text-xl truncate text-lg font-semibold text-[#171717] dark:text-[#FAFAFA]">
        {date || '—'}
      </span>
      <span className="text-xs font-medium text-[#737373] dark:text-[#A3A3A3]">{time}</span>
    </div>
  );
}

export function StayPassCard({ guide, overlapHero = true }: StayPassCardProps) {
  const reduceMotion = useReducedMotion();
  const guestName = guide.booking.guestName.trim() || 'Guest';
  const propertyName = guide.property.name.trim();
  const checkInDate = formatStayBoundaryDateShort(guide.booking.checkInDate);
  const checkOutDate = formatStayBoundaryDateShort(guide.booking.checkOutDate);
  const checkInTime = formatTimeToAMPM(guide.booking.checkInTime, true);
  const checkOutTime = formatTimeToAMPM(guide.booking.checkOutTime, false);

  return (
    <div
      id="stay-guide-pass"
      data-page-editor-anchor="stay-guide-pass"
      className={cn(
        '@2xl:px-6 @5xl:px-8 relative z-30 mx-auto max-w-[720px] px-4',
        overlapHero ? '@2xl:-mt-16 -mt-6' : '@2xl:mt-8 mt-6'
      )}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-[1.75rem] border border-[#E5E5E5] bg-[#FFFFFF] shadow-[0_16px_40px_-12px_rgba(34,31,26,0.35)] dark:border-[#262626] dark:bg-[#171717]"
      >
        {/* Die-cut notches */}
        <span className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[#FFFFFF] dark:bg-[#0A0A0A]" />
        <span className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[#FFFFFF] dark:bg-[#0A0A0A]" />

        <div className="@2xl:flex-row @2xl:items-stretch flex flex-col">
          <div className="@2xl:border-b-0 @2xl:border-r @2xl:p-6 flex min-w-0 flex-1 flex-col gap-1 border-b border-dashed border-[#E5E5E5] p-5 dark:border-[#262626]">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373] dark:text-[#A3A3A3]">
              Guest
            </span>
            <span className="font-fraunces @2xl:text-[1.75rem] truncate text-2xl font-semibold text-[#171717] dark:text-[#FAFAFA]">
              {guestName}
            </span>
            {propertyName ? (
              <span className="truncate text-sm font-medium text-[#737373] dark:text-[#A3A3A3]">
                {propertyName}
              </span>
            ) : null}
          </div>

          <div className="@2xl:gap-4 @2xl:p-6 flex min-w-0 flex-1 items-center gap-3 p-5">
            <StayPassField icon={DoorOpen} label="Check-in" date={checkInDate} time={checkInTime} />
            <ArrowRight className="text-primary/50 @2xl:block hidden size-4 shrink-0" aria-hidden />
            <StayPassField
              icon={LogOut}
              label="Check-out"
              date={checkOutDate}
              time={checkOutTime}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
