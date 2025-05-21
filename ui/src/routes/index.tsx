import { Routes, Route } from 'react-router-dom';
import { GuestFormPage } from '@/pages/GuestFormPage';
import { SuccessPage } from '@/pages/SuccessPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<GuestFormPage />} />
      <Route path="/success" element={<SuccessPage />} />
    </Routes>
  );
}
