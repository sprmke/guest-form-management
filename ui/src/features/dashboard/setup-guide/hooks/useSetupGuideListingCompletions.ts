import { useMemo } from 'react';

import { useQueries } from '@tanstack/react-query';

import {
  appSettingsToFormValues,
  type AppSettingsDto,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import { useOrgBrandColor } from '@/features/dashboard/org/hooks/useOrgBrandColor';
import { useOrgSettings } from '@/features/dashboard/org/hooks/useOrgSettings';
import { scopedFunctionsUrl } from '@/features/dashboard/org/lib/adminApiScope';
import { callEdgeFunction, getSessionJwt } from '@/features/dashboard/org/lib/edgeClient';
import {
  computePropertySettingsCompletion,
  type PropertySettingsSectionId,
} from '@/features/dashboard/org/lib/propertySettingsCompletion';
import { propertyProfileDraftFromProperty } from '@/features/dashboard/org/lib/propertySettingsForm';
import type { Organization, Parking, Property } from '@/features/dashboard/org/types';
import {
  PARKING_SETTINGS_QUERY_KEY,
  type ParkingSettingsPayload,
} from '@/features/dashboard/parking/hooks/useParkingSettings';
import { parkingFeaturesDraftFromSettings } from '@/features/dashboard/parking/lib/parkingFeaturesConstants';
import {
  computeParkingSettingsCompletion,
  type ParkingSettingsSectionId,
} from '@/features/dashboard/parking/lib/parkingSettingsCompletion';
import {
  parkingCoverImageFromSettings,
  parkingDetailsDraftFromSettings,
  parkingLocationDraftFromSettings,
  parkingOperationalDraftFromSettings,
  parkingProfileDraftFromParking,
} from '@/features/dashboard/parking/lib/parkingSettingsForm';
import type { SetupGuideCompletionSnapshot } from '@/features/dashboard/setup-guide/lib/setupGuideProgress';

const PROPERTY_PENDING_SECTIONS = [
  'basic',
  'details',
  'location',
  'media',
  'amenities',
  'house-rules',
  'cancellation',
  'payment',
  'guest-form',
  'building-forms',
  'email-automations',
] as const;

const PARKING_PENDING_SECTIONS = [
  'basic',
  'details',
  'location',
  'media',
  'features',
  'payment',
] as const;

async function fetchAppSettings(propertyId: string): Promise<AppSettingsDto> {
  const jwt = await getSessionJwt();
  const res = await fetch(scopedFunctionsUrl('/app-settings', propertyId), {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: AppSettingsDto;
  };
  if (!json.success || !json.data) {
    throw new Error(json.error ?? 'Failed to load app settings');
  }
  return json.data;
}

async function fetchParkingSettings(parkingId: string): Promise<ParkingSettingsPayload> {
  const params = new URLSearchParams({ parking_id: parkingId });
  return callEdgeFunction<ParkingSettingsPayload>(`parking-settings?${params.toString()}`);
}

/** Live per-listing issue maps for Setup Guide progress (org dashboard scope). */
export function useSetupGuideListingCompletions({
  org,
  properties,
  parkings,
}: {
  org: Organization | null | undefined;
  properties: Property[];
  parkings: Parking[];
}): Pick<
  SetupGuideCompletionSnapshot,
  'propertyIssueSectionIdsById' | 'parkingIssueSectionIdsById'
> {
  const { data: orgSettings } = useOrgSettings();
  const inheritedBrandColor = useOrgBrandColor();

  const orgSocialLinks = useMemo(
    () =>
      orgSettings
        ? {
            facebookPageUrl: orgSettings.facebookPageUrl,
            airbnbUrl: orgSettings.airbnbUrl,
            instagramUrl: orgSettings.instagramUrl,
            tiktokUrl: orgSettings.tiktokUrl,
          }
        : null,
    [orgSettings]
  );

  const propertyQueries = useQueries({
    queries: properties.map((property) => ({
      queryKey: ['app-settings', property.id],
      queryFn: () => fetchAppSettings(property.id),
      enabled: Boolean(org?.id && property.id),
    })),
  });

  const parkingQueries = useQueries({
    queries: parkings.map((parking) => ({
      queryKey: [...PARKING_SETTINGS_QUERY_KEY, parking.id],
      queryFn: () => fetchParkingSettings(parking.id),
      enabled: Boolean(org?.id && parking.id),
    })),
  });

  return useMemo(() => {
    const propertyIssueSectionIdsById: Record<string, readonly PropertySettingsSectionId[]> = {};
    for (const [index, property] of properties.entries()) {
      const appSettings = propertyQueries[index]?.data ?? null;
      if (!appSettings) {
        propertyIssueSectionIdsById[property.id] = PROPERTY_PENDING_SECTIONS;
        continue;
      }
      propertyIssueSectionIdsById[property.id] = computePropertySettingsCompletion({
        profile: propertyProfileDraftFromProperty(property),
        operational: appSettingsToFormValues(appSettings),
        appSettings,
        orgSocialLinks,
      }).issueSectionIds;
    }

    const parkingIssueSectionIdsById: Record<string, readonly ParkingSettingsSectionId[]> = {};
    for (const [index, parking] of parkings.entries()) {
      const settings = parkingQueries[index]?.data ?? null;
      if (!settings) {
        parkingIssueSectionIdsById[parking.id] = PARKING_PENDING_SECTIONS;
        continue;
      }
      parkingIssueSectionIdsById[parking.id] = computeParkingSettingsCompletion({
        profile: parkingProfileDraftFromParking(parking, inheritedBrandColor),
        operational: parkingOperationalDraftFromSettings(settings),
        details: parkingDetailsDraftFromSettings(parking.settings, parking.acceptedVehicleTypes),
        features: parkingFeaturesDraftFromSettings(parking.settings),
        location: parkingLocationDraftFromSettings(parking.settings, parking.residenceName),
        coverImage: parkingCoverImageFromSettings(parking.settings ?? {}),
        appSettings: null,
      }).issueSectionIds;
    }

    return {
      propertyIssueSectionIdsById,
      parkingIssueSectionIdsById,
    } satisfies Pick<
      SetupGuideCompletionSnapshot,
      'propertyIssueSectionIdsById' | 'parkingIssueSectionIdsById'
    >;
  }, [inheritedBrandColor, orgSocialLinks, parkingQueries, parkings, properties, propertyQueries]);
}
