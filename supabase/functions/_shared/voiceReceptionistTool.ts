/**
 * getPropertyFact tool boundary for the voice receptionist — the hard security boundary
 * (see .superpowers/sdd/2026-07-30-ai-voice-receptionist Architecture §1). Even if a guest
 * tampers with the locked system instructions, this allowlist is the only path to data,
 * and it only ever reads the same guest-safe fields as the text-AI inbox context.
 */

import {
  loadGuestSafeAvailabilityContext,
  loadGuestSafeDevelopmentContext,
  loadGuestSafePropertyContext,
  type PropertyGuestContextDto,
} from './inboxAiGuestContext.ts';
import type { DevelopmentGuestContextDto } from './developmentGuestInfo.ts';

type TopicMatcher = { key: string; pattern: RegExp };

/**
 * Ordered allowlist — first match wins. Anything that matches none of these (finance,
 * other guests, staff/internal ops, maintenance, etc.) is rejected by the caller.
 */
const TOPIC_MATCHERS: TopicMatcher[] = [
  { key: 'checkin', pattern: /check[- ]?in/i },
  { key: 'checkout', pattern: /check[- ]?out/i },
  { key: 'wifi', pattern: /wifi|internet|network/i },
  { key: 'pool', pattern: /pool|swim/i },
  { key: 'parking', pattern: /park/i },
  { key: 'pets', pattern: /pet/i },
  { key: 'pricing', pattern: /rate|price|pricing|cost|deposit|fee/i },
  { key: 'availability', pattern: /available|availability|vacan|book(?:ed|ing)?/i },
  { key: 'payment', pattern: /pay|gcash|bank|cash/i },
  { key: 'cancellation', pattern: /cancel|refund/i },
  { key: 'location', pattern: /location|address|map|direction|where/i },
  { key: 'houseRules', pattern: /house rule|rule/i },
  { key: 'requirements', pattern: /requirement|document|need to bring|submit/i },
  { key: 'guides', pattern: /guide|how to|building info|residence info/i },
  { key: 'capacity', pattern: /guest|capacity|bedroom|bathroom|max|sleep|occupan/i },
  { key: 'amenities', pattern: /amenit|facilit/i },
  {
    key: 'overview',
    pattern: /overview|general|about|property|residence|unit|development|building/i,
  },
];

export function matchGuestSafeVoiceTopic(rawTopic: string): string | null {
  const topic = rawTopic.trim();
  if (!topic) return null;
  const match = TOPIC_MATCHERS.find(({ pattern }) => pattern.test(topic));
  return match?.key ?? null;
}

function findAmenityMatching(amenities: string[], pattern: RegExp): string | null {
  return amenities.find((amenity) => pattern.test(amenity)) ?? null;
}

function mergedAmenities(
  property: PropertyGuestContextDto,
  development: DevelopmentGuestContextDto | null
): string[] {
  const set = new Set<string>();
  for (const amenity of property.amenities) set.add(amenity);
  for (const amenity of development?.amenities ?? []) set.add(amenity);
  return [...set];
}

async function renderAvailabilityAnswer(propertyId: string): Promise<string> {
  const availability = await loadGuestSafeAvailabilityContext(propertyId);
  if (availability.blockedRanges.length === 0) {
    return `As of ${availability.asOfDate}, there are no blocked dates on record for the near term — check the booking calendar for exact availability.`;
  }
  const upcoming = availability.blockedRanges
    .slice(0, 5)
    .map((range) => `${range.checkIn} to ${range.checkOut}`)
    .join('; ');
  return `As of ${availability.asOfDate}, these date ranges are already booked: ${upcoming}. Other dates are open — check the booking calendar to confirm.`;
}

function renderPoolAnswer(development: DevelopmentGuestContextDto | null): string {
  if (!development) {
    return 'Pool information is not listed for this property — ask the host team to confirm.';
  }
  const parts: string[] = [];
  if (development.poolFee != null) {
    parts.push(`The pool fee is ${development.poolFee} pesos`);
  }
  if (development.poolSchedule) {
    parts.push(`Pool schedule: ${development.poolSchedule}`);
  }
  if (parts.length === 0) {
    return 'Pool information is not listed for this development — ask the host team to confirm.';
  }
  return parts.join('. ') + '.';
}

function renderRequirementsAnswer(development: DevelopmentGuestContextDto | null): string {
  if (!development) {
    return 'Building requirements are not listed — ask the host team to confirm.';
  }
  const parts: string[] = [];
  if (development.guestRequirements) {
    parts.push(development.guestRequirements);
  }
  if (development.documentRequirementLabels.length > 0) {
    parts.push(
      `Required documents for stays here: ${development.documentRequirementLabels.join(', ')}.`
    );
  }
  if (parts.length === 0) {
    return 'No specific building requirements are listed.';
  }
  return parts.join(' ');
}

function renderGuidesAnswer(development: DevelopmentGuestContextDto | null): string {
  if (!development || development.guestGuides.length === 0) {
    return 'No development guides are listed — ask the host team to confirm.';
  }
  return development.guestGuides.map((guide) => `${guide.title}: ${guide.content}`).join(' ');
}

/**
 * Builds a guest-safe answer for an allowlisted topic. Every field read here comes from
 * `loadGuestSafePropertyContext` / `loadGuestSafeAvailabilityContext` — the same DTOs the
 * text-AI inbox uses, which explicitly never include finance, maintenance, or guest PII.
 */
export async function answerGuestSafeVoiceTopic(
  propertyId: string,
  topicKey: string
): Promise<string> {
  const property = await loadGuestSafePropertyContext(propertyId);
  if (!property) {
    throw new Error('Property not found');
  }
  const development = await loadGuestSafeDevelopmentContext(property.residenceName);
  const amenities = mergedAmenities(property, development);

  switch (topicKey) {
    case 'checkin':
      return `Check-in is at ${property.checkInTime}. Self check-in: ${property.selfCheckIn ? 'yes' : 'no'}.`;
    case 'checkout':
      return `Check-out is at ${property.checkOutTime}.`;
    case 'wifi': {
      const wifiAmenity = findAmenityMatching(amenities, /wifi|internet/i);
      return wifiAmenity
        ? `Wifi is included: ${wifiAmenity}.`
        : 'Wifi details are not listed — ask the host team to confirm.';
    }
    case 'pool':
      return renderPoolAnswer(development);
    case 'parking':
      return property.pricing.parkingRateGuest != null
        ? `Guest parking is available for ${property.pricing.parkingRateGuest} pesos — ask the host team to arrange it.`
        : 'Parking is not listed for this property — ask the host team to confirm.';
    case 'pets':
      return property.pricing.petFee != null
        ? `Pets are welcome with a ${property.pricing.petFee} pesos pet fee.`
        : 'Pet policy is not listed for this property — ask the host team to confirm.';
    case 'pricing': {
      let answer =
        `Weekday rate is ${property.pricing.weekdayNightlyRate} pesos per night, weekend rate is ${property.pricing.weekendNightlyRate} pesos per night.` +
        (property.pricing.securityDeposit != null
          ? ` Security deposit is ${property.pricing.securityDeposit} pesos.`
          : '');
      if (development?.poolFee != null) {
        answer += ` Pool fee is ${development.poolFee} pesos.`;
      }
      return answer;
    }
    case 'availability':
      return renderAvailabilityAnswer(propertyId);
    case 'payment':
      return property.paymentMethodsSummary;
    case 'cancellation':
      return `${property.cancellationPolicyTitle}. ${property.cancellationPolicyDescription}`;
    case 'location': {
      const developmentLocation = development?.locationLabel?.trim();
      const base = `${property.address || property.locationLabel}.`;
      const developmentLine = developmentLocation ? ` Development: ${developmentLocation}.` : '';
      const mapLine = property.mapsUrl ? ` Map: ${property.mapsUrl}` : '';
      return `${base}${developmentLine}${mapLine}`;
    }
    case 'houseRules':
      return property.houseRules.length
        ? `House rules: ${property.houseRules.join('; ')}.`
        : 'No specific house rules are listed.';
    case 'requirements':
      return renderRequirementsAnswer(development);
    case 'guides':
      return renderGuidesAnswer(development);
    case 'capacity':
      return `This property sleeps up to ${property.maxGuests} guests, with ${property.bedrooms} bedroom(s) and ${property.bathrooms} bathroom(s).`;
    case 'amenities':
      return amenities.length
        ? `Amenities include: ${amenities.join(', ')}.`
        : 'No amenities are listed for this property.';
    case 'overview':
    default: {
      const developmentName = development?.name ?? property.residenceName;
      const developmentLine = developmentName ? ` in ${developmentName}` : '';
      const extraInfo = development?.importantInfo ? ` ${development.importantInfo}` : '';
      return `${property.name} is located in ${property.locationLabel}${developmentLine}, sleeps up to ${property.maxGuests} guests, with check-in at ${property.checkInTime} and check-out at ${property.checkOutTime}.${extraInfo}`;
    }
  }
}
