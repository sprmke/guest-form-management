import { Route } from 'react-router-dom';
import { SdFormPage } from '@/features/sd-form/pages/SdFormPage';

export const sdFormRoutes = [
  <Route key="sd-form" path="/sd-form" element={<SdFormPage />} />,
];
