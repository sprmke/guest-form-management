import { motion } from 'framer-motion';
import { ArrowUpFromLine, Car, MoveHorizontal, Ruler } from 'lucide-react';

import {
  developmentDetailPath,
  resolvePublicDevelopment,
} from '@/features/guest/marketing/developments/lib/resolvePublicDevelopment';
import {
  DEFAULT_PARKING_HEIGHT_CLEARANCE_M,
  DEFAULT_PARKING_SPACE_LENGTH_M,
  DEFAULT_PARKING_SPACE_WIDTH_M,
} from '@/features/dashboard/parking/lib/parkingDimensionDefaults';
import { formatParkingDimensionMeters } from '@/features/guest/marketing/parkings/lib/parkingDimensions';
import { parkingTypeLabel } from '@/features/guest/marketing/parkings/lib/parkingTypeLabel';
import { ListingCheckInOutTimes } from '@/features/guest/marketing/shared/components/ListingCheckInOutTimes';
import { ListingExpandableText } from '@/features/guest/marketing/shared/components/ListingExpandableText';
import {
  ListingHostCard,
  type ListingHostInfo,
} from '@/features/guest/marketing/shared/components/ListingHostCard';
import { ListingPlaceMeta } from '@/features/guest/marketing/shared/components/ListingPlaceMeta';
import { ListingStatItem } from '@/features/guest/marketing/shared/components/ListingStatItem';
import { buildParkingPlacementLabels } from '@/features/guest/marketing/shared/lib/listingPlacement';

type Props = {
  name: string;
  parkingType: string;
  residenceName: string | null;
  tower: string | null;
  level: string | null;
  slotLabel: string;
  description: string | null;
  host: ListingHostInfo | null;
  geoLocation?: string | null;
  spaceLengthM?: number | null;
  spaceWidthM?: number | null;
  heightClearanceM?: number | null;
  checkInTime?: string;
  checkOutTime?: string;
};

export function ParkingOverview({
  name,
  parkingType,
  residenceName,
  tower,
  level,
  description,
  host,
  geoLocation,
  spaceLengthM = DEFAULT_PARKING_SPACE_LENGTH_M,
  spaceWidthM = DEFAULT_PARKING_SPACE_WIDTH_M,
  heightClearanceM = DEFAULT_PARKING_HEIGHT_CLEARANCE_M,
  checkInTime = '2:00 PM',
  checkOutTime = '12:00 PM',
}: Props) {
  const development = resolvePublicDevelopment(residenceName);
  const placementLabels = buildParkingPlacementLabels(tower, level);
  const resolvedGeo = geoLocation?.trim() || development?.locationLabel || null;

  const lengthLabel = formatParkingDimensionMeters(spaceLengthM)!;
  const widthLabel = formatParkingDimensionMeters(spaceWidthM)!;
  const heightLabel = formatParkingDimensionMeters(heightClearanceM)!;

  return (
    <div className="space-y-6">
      <div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 flex flex-wrap items-center gap-2"
        >
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
            <Car className="h-3.5 w-3.5" aria-hidden />
            {parkingTypeLabel(parkingType)}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-foreground mb-2 text-2xl font-bold sm:text-3xl lg:text-4xl"
        >
          {name}
        </motion.h1>

        <ListingPlaceMeta
          development={
            development
              ? { name: development.name, href: developmentDetailPath(development.slug) }
              : null
          }
          placementLabels={placementLabels}
          geoLocation={resolvedGeo}
          motionDelay={0.1}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="border-border bg-card grid grid-cols-2 gap-4 rounded-2xl border p-4 sm:grid-cols-3"
      >
        <ListingStatItem icon={Ruler} value={lengthLabel} label="length" />
        <ListingStatItem icon={MoveHorizontal} value={widthLabel} label="width" />
        <ListingStatItem icon={ArrowUpFromLine} value={heightLabel} label="height clearance" />
      </motion.div>

      {host ? <ListingHostCard host={host} motionDelay={0.2} /> : null}

      <ListingCheckInOutTimes
        checkInTime={checkInTime}
        checkOutTime={checkOutTime}
        motionDelay={0.3}
      />

      {description ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-4"
        >
          <h2 className="text-foreground text-xl font-semibold">About this parking</h2>
          <ListingExpandableText text={description} maxLines={8} />
        </motion.div>
      ) : null}
    </div>
  );
}
