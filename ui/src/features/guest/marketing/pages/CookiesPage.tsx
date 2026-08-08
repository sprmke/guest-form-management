import { LegalSimplePage } from '@/features/guest/marketing/legal/components/LegalSimplePage';

export function CookiesPage() {
  return (
    <LegalSimplePage
      title="Cookie Policy"
      description="How Kame Homes uses cookies and similar browser storage on the marketing site, guest flows, and dashboards."
      sections={[
        {
          title: 'Overview',
          paragraphs: [
            'Kame Homes uses a small amount of browser storage to keep you signed in and to remember basic preferences. We do not load separate analytics or advertising cookie scripts on the marketing or guest booking surfaces as of this policy.',
            'Contact: hello@kamehomes.com. See also our Privacy Policy and Terms of Service.',
          ],
        },
        {
          title: 'What we store',
          paragraphs: [
            'When you sign in (host dashboard or guest portal), Supabase Auth stores a session in the browser (typically local storage or cookies managed by the auth client) so you stay logged in across page loads.',
            'We may also store UI preferences such as theme (light/dark) locally. Mode-switch and similar client state may use in-memory or local storage for navigation between guest and host marketing modes.',
          ],
        },
        {
          title: 'Why we use them',
          paragraphs: [
            'Session storage is required for authenticated features (dashboards, guest portal, team invites). Preference storage improves usability and is not used to track you across unrelated third-party sites.',
          ],
        },
        {
          title: 'Third parties',
          paragraphs: [
            'Embedded or linked third-party services (for example Google Maps, Meta, or OAuth providers) may set their own cookies when you interact with those flows. Their policies apply to that activity.',
            'We do not operate a separate advertising pixel network on these pages.',
          ],
        },
        {
          title: 'Your controls',
          paragraphs: [
            'You can clear site data or block cookies in your browser settings. Blocking authentication storage will prevent sign-in and signed-in features from working.',
            'For privacy questions beyond cookies, see the Privacy Policy or email hello@kamehomes.com.',
          ],
        },
      ]}
    />
  );
}
