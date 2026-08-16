import { motion } from 'framer-motion';

import { getParkingSlotsByDevelopmentSlug } from '@/features/guest/marketing/developments/data/mockParkingSlots';
import { parkingListEntriesForSlots } from '@/features/guest/marketing/parkings/lib/parkingListEntries';
import { PropertiesLocationRow } from '@/features/guest/marketing/properties/components/PropertiesLocationRow';
import { mockProperties } from '@/features/guest/marketing/properties/data/mockProperties';
import { propertiesForDevelopment } from '@/features/guest/marketing/properties/lib/groupPropertiesByDevelopment';

import { DevelopmentParkingRow } from './DevelopmentParkingRow';

import type { Development } from '../types';

interface DevelopmentAvailableSectionProps {
  development: Development;
}

export function DevelopmentAvailableSection({ development }: DevelopmentAvailableSectionProps) {
  const properties = propertiesForDevelopment(development, mockProperties);
  const parkingSlots = getParkingSlotsByDevelopmentSlug(development.slug, {
    availableOnly: true,
  });
  const parkingEntries = parkingListEntriesForSlots(parkingSlots, development);

  if (properties.length === 0 && parkingEntries.length === 0) return null;

  return (
    <section className="border-border border-t">
      <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="min-w-0 space-y-10 sm:space-y-12"
        >
          {properties.length > 0 && (
            <PropertiesLocationRow
              title="Available Homes"
              viewAllTo={`/developments/${development.slug}/properties`}
              properties={properties}
            />
          )}
          {parkingEntries.length > 0 && (
            <DevelopmentParkingRow
              title="Available Parking"
              viewAllTo={`/developments/${development.slug}/parking`}
              entries={parkingEntries}
            />
          )}
        </motion.div>
      </div>
    </section>
  );
}
