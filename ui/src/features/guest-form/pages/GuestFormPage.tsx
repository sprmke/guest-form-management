import { GuestForm } from '@/features/guest-form/components/GuestForm';
import { MainLayout } from '@/layouts/MainLayout';

/** `/form` is reachable without query params (defaults apply); do not redirect to `/`. */
export function GuestFormPage() {
  return (
    <MainLayout>
      <GuestForm />
    </MainLayout>
  );
}
