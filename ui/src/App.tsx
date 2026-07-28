import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { GuestAuthProvider } from '@/features/guest/auth/context/GuestAuthContext';
import { SavedPropertiesSync } from '@/features/guest/marketing/properties/components/SavedPropertiesSync';

import { AppRoutes } from '@/routes';

// Conservative defaults: short stale time so admins see fresh data, but refetch on window focus
// is disabled to avoid hammering Supabase while an admin has multiple tabs open.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GuestAuthProvider>
        <SavedPropertiesSync />
        <AppRoutes />
      </GuestAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
