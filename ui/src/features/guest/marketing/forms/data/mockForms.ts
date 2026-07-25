/**
 * Mock Guest Forms Data
 * Simulates forms created by hosts via the dashboard Form Builder
 */

import type { GuestForm } from '@/features/guest/marketing/forms/lib/guest-forms/types';
import {
  AZURE_GUEST_ADVISE_TEMPLATE,
  PARKING_DETAILS_TEMPLATE,
  PET_INFORMATION_TEMPLATE,
} from '@/features/guest/marketing/forms/lib/guest-forms/templates';
import { mockProperties } from '@/features/guest/marketing/properties/data/mockProperties';

function propertyIdsForSlugOrId(slugOrId: string): string[] {
  const property = mockProperties.find((p) => p.slug === slugOrId || p.id === slugOrId);
  if (!property) return [slugOrId];
  return [property.id, property.slug];
}

// Simulate forms created from templates with property context
export const mockGuestForms: Record<string, GuestForm> = {
  // Azure Guest Advise Form
  'azure-guest-form': {
    id: 'azure-guest-form',
    propertyId: 'property-kame-home',
    name: 'Kame Home — Guest Advise Form',
    description:
      'Complete this form to register your stay at Kame Home in Azure North Residences. Please provide accurate information for building security and a smooth check-in experience.',
    isActive: true,
    version: 1,
    steps: AZURE_GUEST_ADVISE_TEMPLATE.steps,
    styling: AZURE_GUEST_ADVISE_TEMPLATE.styling,
    settings: AZURE_GUEST_ADVISE_TEMPLATE.settings,
    publicUrl: '/properties/kame-home/forms/azure-guest-form',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-20'),
  },

  // Parking Details Form
  'parking-form': {
    id: 'parking-form',
    propertyId: 'property-kame-home',
    name: 'Parking Registration Form',
    description:
      'Submit your vehicle details for parking registration at Azure North. Please complete this form at least 24 hours before check-in.',
    isActive: true,
    version: 1,
    steps: PARKING_DETAILS_TEMPLATE.steps,
    styling: PARKING_DETAILS_TEMPLATE.styling,
    settings: PARKING_DETAILS_TEMPLATE.settings,
    publicUrl: '/properties/kame-home/forms/parking-form',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-20'),
  },

  // Pet Information Form
  'pet-form': {
    id: 'pet-form',
    propertyId: 'property-kame-home',
    name: 'Pet Registration Form',
    description:
      'Register your pet for your stay at Azure North. Please provide vaccination records and a recent photo of your pet.',
    isActive: true,
    version: 1,
    steps: PET_INFORMATION_TEMPLATE.steps,
    styling: PET_INFORMATION_TEMPLATE.styling,
    settings: PET_INFORMATION_TEMPLATE.settings,
    publicUrl: '/properties/kame-home/forms/pet-form',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-20'),
  },

  // Development-level Parking Form (Azure North Residences building-wide parking)
  'dev-parking-form': {
    id: 'dev-parking-form',
    propertyId: 'dev-azure-north',
    name: 'Azure North — Building Parking Registration',
    description:
      'Register your vehicle for parking access at Azure North Residences. Submit your vehicle details at least 24 hours before arrival to guarantee an assigned parking slot.',
    isActive: true,
    version: 1,
    steps: PARKING_DETAILS_TEMPLATE.steps,
    styling: PARKING_DETAILS_TEMPLATE.styling,
    settings: PARKING_DETAILS_TEMPLATE.settings,
    publicUrl: '/developments/azure-north-residences/forms/dev-parking-form',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-20'),
  },
};

export function getFormById(formId: string): GuestForm | undefined {
  return mockGuestForms[formId];
}

/**
 * Get form by property and form id. Returns form only if it belongs to the given property.
 */
export function getFormByPropertyAndFormId(
  propertySlugOrId: string,
  formId: string
): GuestForm | undefined {
  const form = mockGuestForms[formId];
  if (!form) return undefined;
  const allowedIds = propertyIdsForSlugOrId(propertySlugOrId);
  if (!allowedIds.includes(form.propertyId)) return undefined;
  return form;
}

/**
 * Get form by development slug and form id. Returns form only if it belongs to the given development.
 * Development forms use the development id (e.g. 'dev-azure-north') as propertyId.
 */
export function getFormByDevelopmentSlugAndFormId(
  developmentSlug: string,
  formId: string
): GuestForm | undefined {
  const form = mockGuestForms[formId];
  if (!form) return undefined;
  // Development forms use the development slug to match — look up by slug → id mapping
  const devIdBySlug: Record<string, string> = {
    'azure-north-residences': 'dev-azure-north',
    'avida-towers-bgc': 'dev-avida-bgc',
    'smdc-shell-residences': 'dev-smdc-shell',
  };
  const expectedDevId = devIdBySlug[developmentSlug];
  if (!expectedDevId || form.propertyId !== expectedDevId) return undefined;
  return form;
}

export function getAllForms(): GuestForm[] {
  return Object.values(mockGuestForms);
}

/**
 * Returns the parking form (if any) for a given property id.
 */
export function getParkingFormForProperty(propertySlugOrId: string): GuestForm | undefined {
  const allowedIds = propertyIdsForSlugOrId(propertySlugOrId);
  return Object.values(mockGuestForms).find(
    (f) => allowedIds.includes(f.propertyId) && f.id.includes('parking')
  );
}

// Property info associated with forms
export const mockPropertyInfo: Record<
  string,
  { name: string; location: string; image: string; host: string }
> = {
  'property-kame-home': {
    name: 'Kame Home',
    location: 'San Fernando City, Pampanga',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600',
    host: 'Kame Homes',
  },
};

// Development info associated with development-level forms
export const mockDevelopmentInfo: Record<
  string,
  { name: string; location: string; image: string; developerName: string }
> = {
  'dev-azure-north': {
    name: 'Azure North Residences',
    location: 'San Fernando City, Pampanga',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600',
    developerName: 'Century Properties',
  },
};
