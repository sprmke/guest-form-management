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
        expand={false}
        richColors
        closeButton
        duration={Infinity}
        toastOptions={{
          style: {
            maxWidth: '500px',
            padding: '16px 48px 16px 20px',
            fontSize: '15px',
            borderRadius: '12px',
          },
          className: 'border shadow-lg',
          descriptionClassName: 'text-[14px] leading-relaxed opacity-90',
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
