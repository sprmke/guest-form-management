/**
 * Property subscription access — dashboard restriction when billing is suspended.
 */

import { getActivePropertySubscription } from './planEntitlements.ts';

export class PropertySubscriptionSuspendedError extends Error {
  readonly propertyId: string;

  constructor(propertyId: string) {
    super('Property subscription is suspended — pay to restore access');
    this.name = 'PropertySubscriptionSuspendedError';
    this.propertyId = propertyId;
  }
}

/** Throws when the property subscription is suspended (paid tier only). */
export async function assertPropertySubscriptionActive(propertyId: string): Promise<void> {
  const subscription = await getActivePropertySubscription(propertyId);
  if (!subscription) return;

  if (subscription.status === 'suspended') {
    throw new PropertySubscriptionSuspendedError(propertyId);
  }
}

export async function getPropertySubscriptionBillingState(propertyId: string): Promise<{
  status: string;
  isSuspended: boolean;
  isPastDue: boolean;
  planCode: string;
}> {
  const subscription = await getActivePropertySubscription(propertyId);
  if (!subscription) {
    return { status: 'none', isSuspended: false, isPastDue: false, planCode: 'free' };
  }
  return {
    status: subscription.status,
    isSuspended: subscription.status === 'suspended',
    isPastDue: subscription.status === 'past_due',
    planCode: subscription.planCode,
  };
}
