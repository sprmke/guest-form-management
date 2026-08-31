/**
 * Host verification tier gates.
 * Run: deno test --allow-env supabase/functions/_shared/orgVerification_test.ts
 */

import { assert, assertFalse } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  canSubmitBaseVerification,
  canSubmitEnhancedVerification,
  emptyOrgVerificationState,
  type OrgVerificationState,
} from './orgVerification.ts';

function withValidId(): OrgVerificationState {
  return {
    ...emptyOrgVerificationState(),
    assets: {
      ...emptyOrgVerificationState().assets,
      validIdPath: 'org/id/valid_id/a.jpg',
    },
  };
}

Deno.test('host base submit requires Valid ID only', () => {
  assertFalse(canSubmitBaseVerification(emptyOrgVerificationState()));
  assert(canSubmitBaseVerification(withValidId()));
});

Deno.test('host base submit does not require Facebook Page screenshot', () => {
  const withIdNoFacebook = withValidId();
  assert(canSubmitBaseVerification(withIdNoFacebook));
  assertFalse(canSubmitEnhancedVerification(withIdNoFacebook));
});

Deno.test('host Recommended still requires Facebook Page, selfie, and platform admin', () => {
  const ready: OrgVerificationState = {
    ...withValidId(),
    platformAdminPlatform: 'instagram',
    assets: {
      ...withValidId().assets,
      socialProofPath: 'org/id/social_proof/fb.jpg',
      selfieWithIdPath: 'org/id/selfie_with_id/s.jpg',
      platformAdminProofPath: 'org/id/platform_admin_proof/ig.jpg',
    },
  };

  assert(canSubmitEnhancedVerification(ready));
  assertFalse(
    canSubmitEnhancedVerification({
      ...ready,
      assets: { ...ready.assets, socialProofPath: null },
    })
  );
});
