import { Route } from 'react-router-dom';

import { guestAuthRoutes } from '@/features/guest/auth/routes';
import { VoiceReceptionistSpikePage } from '@/features/guest/chat/pages/VoiceReceptionistSpikePage';
import { marketingRoutes } from '@/features/guest/marketing/routes';
import { legacyGuestRedirects, propertyGuestRoutes } from '@/features/guest/property/routes';

/** Guest-facing routes: marketing site + property-scoped operational flows. */
export const guestRoutes = [
  ...marketingRoutes,
  ...guestAuthRoutes,
  ...propertyGuestRoutes,
  ...legacyGuestRedirects,
  /** Throwaway Gemini Live spike — remove after voice receptionist ships. */
  <Route key="dev-voice-spike" path="/dev/voice-spike" element={<VoiceReceptionistSpikePage />} />,
];
