import React from 'react';

import ReactDOM from 'react-dom/client';

import { BrowserRouter } from 'react-router-dom';

import { PostHogProvider } from '@posthog/react';

import { AppErrorBoundary } from '@/components/error/AppErrorBoundary';
import { ScrollToTop } from '@/components/navigation/ScrollToTop';
import { posthog } from '@/lib/posthog/client';
import { PostHogIdentitySync } from '@/lib/posthog/PostHogIdentitySync';

import App from './App';
import { ThemedToaster } from './components/theme/ThemedToaster';
import { ThemeProvider } from './components/theme/ThemeProvider';
import 'react-day-picker/dist/style.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <PostHogProvider client={posthog}>
        <ThemeProvider>
          <BrowserRouter>
            <ScrollToTop />
            <PostHogIdentitySync />
            <App />
            <ThemedToaster />
          </BrowserRouter>
        </ThemeProvider>
      </PostHogProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
