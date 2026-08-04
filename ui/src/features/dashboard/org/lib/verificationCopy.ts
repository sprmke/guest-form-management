/** Host-facing verification messaging (Get Verified modal + sidebar). Guest tooltip stays on ListingRecommendedBadge. */

export const VERIFICATION_TIER2_SUBTITLE =
  'Earn a Recommended badge guests notice on your listings.';

export const VERIFICATION_BENEFIT_BULLETS = [
  'Stand out on your host page and listings',
  'Guests see a clear Recommended badge',
  'Access more host features in the app',
] as const;

export const VERIFICATION_SIDEBAR_SUBLABEL = 'Earn your Recommended badge.';

export const VERIFICATION_PREVIEW_CAPTION = 'Guests see this on your listings.';

export const VERIFICATION_PREVIEW_FALLBACK_NAME = 'Your host name';

export const VERIFICATION_REVIEW_TIMELINE = 'Review usually takes a few hours up to 3 days.';

export const VERIFICATION_TIER2_APPROVED =
  'Recommended badge is live on your host page and listings.';

export const VERIFICATION_TIER2_DOC_LABELS = {
  selfie: 'Selfie with valid ID',
  ownership: 'Additional Proof of Ownership/Authorization',
  azurePmoConfirmation: 'Azure Property Management email confirmation',
} as const;

export const VERIFICATION_TIER2_DOC_HELP = {
  selfie:
    'Hold your valid ID next to your face. Use good light, no filters, and keep ID text readable.',
  ownership:
    'e.g. Certificate of Title, Deed of Sale, Sublease Contract Agreement, Notarized Authorization (SPA), etc.',
  azurePmoConfirmation:
    'e.g. Property Management Email confirmation, approved GAF, gate pass, or building pass.',
} as const;
