import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { ScrollToTop } from './components/ScrollToTop';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <App />
      <Toaster
        position="top-center"
        expand
        closeButton
        duration={7000}
        visibleToasts={5}
        gap={8}
        offset={16}
        icons={{
          success: null,
          error: null,
          warning: null,
          info: null,
        }}
        toastOptions={{
          duration: 7000,
          style: {
            maxWidth: 'min(500px, calc(100vw - 32px))',
            padding: '14px 42px 14px 18px',
            fontSize: '15px',
            borderRadius: '12px',
          },
          className: 'shadow-lg',
          descriptionClassName:
            'text-[14px] font-semibold leading-relaxed text-muted-foreground',
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);
