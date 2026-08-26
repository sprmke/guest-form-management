import { DEFAULT_PARKING_AUTOMATION_TOGGLES } from '@/features/dashboard/parking/lib/parkingEmailAutomation';
import type { ParkingAutomationToggles } from '@/features/dashboard/parking/lib/parkingEmailAutomation';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Props = {
  value: ParkingAutomationToggles;
  disabled?: boolean;
  onChange: (key: keyof ParkingAutomationToggles, enabled: boolean) => void;
};

/** Phase 5 — the top-ranked candidate is claimed automatically instead of waiting for a manual Accept tap. */
export function ParkingBookingAutomationSection({ value, disabled, onChange }: Props) {
  const toggles = value ?? DEFAULT_PARKING_AUTOMATION_TOGGLES;

  return (
    <div className="flex min-h-[44px] items-start justify-between gap-4">
      <div>
        <Label htmlFor="parking-automation-autoAcceptTopMatch" className="text-sm font-medium">
          Auto-accept top match
        </Label>
        <p className="text-muted-foreground mt-1 text-xs">
          Automatically accept the top-ranked request instead of waiting for a manual Accept — the
          guest still has to pay before endorsement fires.
        </p>
      </div>
      <Switch
        id="parking-automation-autoAcceptTopMatch"
        checked={toggles.autoAcceptTopMatch}
        disabled={disabled}
        onCheckedChange={(checked) => onChange('autoAcceptTopMatch', checked)}
      />
    </div>
  );
}
