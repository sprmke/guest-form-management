import React from 'react';

import ReactDOM from 'react-dom/client';

import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { ScrollToTop } from '@/components/navigation/ScrollToTop';
import { ThemedToaster } from './components/theme/ThemedToaster';
import { ThemeProvider } from './components/theme/ThemeProvider';
import 'react-day-picker/dist/style.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <App />
        <ThemedToaster />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
