import { useMemo } from 'react';

import { useParkings } from '@/features/dashboard/org/hooks/useParkings';
import { useProperties } from '@/features/dashboard/org/hooks/useOrganizations';
import { PARKING_ROLES } from '@/features/dashboard/team/lib/parkingTeamConstants';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type OrgListingPropertyAssignment = {
  propertyId: string;
  roleId: string;
  permissions: string[];
};

export type OrgListingParkingAssignment = {
  parkingId: string;
  roleId: string;
  permissions: string[];
};

export type OrgListingAssignments = {
  properties: OrgListingPropertyAssignment[];
  parkings: OrgListingParkingAssignment[];
};

type Props = {
  orgSlug: string;
  allListings: boolean;
  assignments: OrgListingAssignments;
  defaultPropertyRoleId?: string;
  defaultParkingRoleId?: string;
  onAllListingsChange: (value: boolean) => void;
  onAssignmentsChange: (value: OrgListingAssignments) => void;
  disabled?: boolean;
  className?: string;
};

const DEFAULT_PROPERTY_ROLE = 'ADMIN';
const DEFAULT_PARKING_ROLE = 'MANAGER';

export function emptyOrgListingAssignments(): OrgListingAssignments {
  return { properties: [], parkings: [] };
}

export function OrgListingAssignmentPicker({
  orgSlug,
  allListings,
  assignments,
  defaultPropertyRoleId = DEFAULT_PROPERTY_ROLE,
  defaultParkingRoleId = DEFAULT_PARKING_ROLE,
  onAllListingsChange,
  onAssignmentsChange,
  disabled = false,
  className,
}: Props) {
  const { data: propertiesData } = useProperties(orgSlug);
  const { data: parkingsData } = useParkings(orgSlug);

  const properties = propertiesData?.properties ?? [];
  const parkings = parkingsData?.parkings ?? [];

  const selectedPropertyIds = useMemo(
    () => new Set(assignments.properties.map((entry) => entry.propertyId)),
    [assignments.properties]
  );
  const selectedParkingIds = useMemo(
    () => new Set(assignments.parkings.map((entry) => entry.parkingId)),
    [assignments.parkings]
  );

  const toggleProperty = (propertyId: string, checked: boolean) => {
    if (checked) {
      onAssignmentsChange({
        ...assignments,
        properties: [
          ...assignments.properties,
          { propertyId, roleId: defaultPropertyRoleId, permissions: [] },
        ],
      });
      return;
    }
    onAssignmentsChange({
      ...assignments,
      properties: assignments.properties.filter((entry) => entry.propertyId !== propertyId),
    });
  };

  const toggleParking = (parkingId: string, checked: boolean) => {
    if (checked) {
      onAssignmentsChange({
        ...assignments,
        parkings: [
          ...assignments.parkings,
          { parkingId, roleId: defaultParkingRoleId, permissions: [] },
        ],
      });
      return;
    }
    onAssignmentsChange({
      ...assignments,
      parkings: assignments.parkings.filter((entry) => entry.parkingId !== parkingId),
    });
  };

  const selectAllProperties = () => {
    onAssignmentsChange({
      ...assignments,
      properties: properties.map((property) => ({
        propertyId: property.id,
        roleId: defaultPropertyRoleId,
        permissions: [],
      })),
    });
  };

  const selectAllParkings = () => {
    onAssignmentsChange({
      ...assignments,
      parkings: parkings.map((parking) => ({
        parkingId: parking.id,
        roleId: defaultParkingRoleId,
        permissions: [],
      })),
    });
  };

  const updatePropertyRole = (propertyId: string, roleId: string) => {
    onAssignmentsChange({
      ...assignments,
      properties: assignments.properties.map((entry) =>
        entry.propertyId === propertyId ? { ...entry, roleId, permissions: [] } : entry
      ),
    });
  };

  const updateParkingRole = (parkingId: string, roleId: string) => {
    onAssignmentsChange({
      ...assignments,
      parkings: assignments.parkings.map((entry) =>
        entry.parkingId === parkingId ? { ...entry, roleId, permissions: [] } : entry
      ),
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
        <Label htmlFor="org-all-listings" className="text-sm font-medium">
          All listings
        </Label>
        <Switch
          id="org-all-listings"
          checked={allListings}
          onCheckedChange={onAllListingsChange}
          disabled={disabled}
        />
      </div>

      {!allListings ? (
        <div className="space-y-4">
          {properties.length > 0 ? (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-sm font-medium">Properties</p>
                <button
                  type="button"
                  className="text-primary text-xs font-medium"
                  onClick={selectAllProperties}
                  disabled={disabled}
                >
                  Select all
                </button>
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                {properties.map((property) => {
                  const checked = selectedPropertyIds.has(property.id);
                  const assignment = assignments.properties.find(
                    (entry) => entry.propertyId === property.id
                  );
                  return (
                    <div
                      key={property.id}
                      className="flex items-center gap-2 rounded-md px-1 py-1.5"
                    >
                      <Checkbox
                        id={`org-listing-property-${property.id}`}
                        checked={checked}
                        onCheckedChange={(value) => toggleProperty(property.id, value === true)}
                        disabled={disabled}
                        className="size-5"
                      />
                      <Label
                        htmlFor={`org-listing-property-${property.id}`}
                        className="min-w-0 flex-1 truncate text-sm font-normal"
                      >
                        {property.name}
                      </Label>
                      {checked ? (
                        <Select
                          value={assignment?.roleId ?? defaultPropertyRoleId}
                          onValueChange={(value) => updatePropertyRole(property.id, value)}
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-8 w-[7.5rem] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="STAFF">Staff</SelectItem>
                            <SelectItem value="VIEWER">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {parkings.length > 0 ? (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-sm font-medium">Parkings</p>
                <button
                  type="button"
                  className="text-primary text-xs font-medium"
                  onClick={selectAllParkings}
                  disabled={disabled}
                >
                  Select all
                </button>
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                {parkings.map((parking) => {
                  const checked = selectedParkingIds.has(parking.id);
                  const assignment = assignments.parkings.find(
                    (entry) => entry.parkingId === parking.id
                  );
                  return (
                    <div
                      key={parking.id}
                      className="flex items-center gap-2 rounded-md px-1 py-1.5"
                    >
                      <Checkbox
                        id={`org-listing-parking-${parking.id}`}
                        checked={checked}
                        onCheckedChange={(value) => toggleParking(parking.id, value === true)}
                        disabled={disabled}
                        className="size-5"
                      />
                      <Label
                        htmlFor={`org-listing-parking-${parking.id}`}
                        className="min-w-0 flex-1 truncate text-sm font-normal"
                      >
                        {parking.name}
                      </Label>
                      {checked ? (
                        <Select
                          value={assignment?.roleId ?? defaultParkingRoleId}
                          onValueChange={(value) => updateParkingRole(parking.id, value)}
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-8 w-[7.5rem] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PARKING_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {properties.length === 0 && parkings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No listings in this organization yet.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
