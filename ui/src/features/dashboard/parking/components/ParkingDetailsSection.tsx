import { ArrowUpFromLine, Home, MoveHorizontal, Ruler } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { SettingsField } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import type { ParkingDetailsDraft } from '@/features/dashboard/parking/lib/parkingSettingsForm';

import { Input } from '@/components/ui/input';

type Props = {
  draft: ParkingDetailsDraft;
  onChange: (next: ParkingDetailsDraft) => void;
  disabled?: boolean;
};

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function ParkingDetailsSection({ draft, onChange, disabled = false }: Props) {
  const setField = <K extends keyof ParkingDetailsDraft>(key: K, value: ParkingDetailsDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  return (
    <AdminSection id="details" title="Parking Details" icon={Home}>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <SettingsField id="parking-space-length" label="Length (m)">
          <div className="relative">
            <Ruler
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="parking-space-length"
              type="number"
              min={0}
              step={0.1}
              value={draft.spaceLengthM}
              onChange={(event) => setField('spaceLengthM', event.target.value)}
              disabled={disabled}
              placeholder="Optional"
              className="h-10 pl-9"
            />
          </div>
        </SettingsField>

        <SettingsField id="parking-space-width" label="Width (m)">
          <div className="relative">
            <MoveHorizontal
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="parking-space-width"
              type="number"
              min={0}
              step={0.1}
              value={draft.spaceWidthM}
              onChange={(event) => setField('spaceWidthM', event.target.value)}
              disabled={disabled}
              placeholder="Optional"
              className="h-10 pl-9"
            />
          </div>
        </SettingsField>

        <SettingsField id="parking-height-clearance" label="Height clearance (m)">
          <div className="relative">
            <ArrowUpFromLine
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="parking-height-clearance"
              type="number"
              min={0}
              step={0.1}
              value={draft.heightClearanceM}
              onChange={(event) => setField('heightClearanceM', event.target.value)}
              disabled={disabled}
              placeholder="Optional"
              className="h-10 pl-9"
            />
          </div>
        </SettingsField>
      </div>

      <FieldGrid>
        <SettingsField id="parking-check-in" label="Check-in Time" required>
          <Input
            id="parking-check-in"
            type="time"
            value={draft.checkInTime}
            onChange={(event) => setField('checkInTime', event.target.value)}
            disabled={disabled}
            className="h-10"
          />
        </SettingsField>

        <SettingsField id="parking-check-out" label="Check-out Time" required>
          <Input
            id="parking-check-out"
            type="time"
            value={draft.checkOutTime}
            onChange={(event) => setField('checkOutTime', event.target.value)}
            disabled={disabled}
            className="h-10"
          />
        </SettingsField>
      </FieldGrid>
    </AdminSection>
  );
}
