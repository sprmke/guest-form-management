import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GuestForm } from '@/features/guest-form/components/GuestForm';
import { MainLayout } from '@/layouts/MainLayout';

export function GuestFormPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const bookingId = searchParams.get('bookingId')?.trim();
    const checkIn = searchParams.get('checkInDate')?.trim();
    const checkOut = searchParams.get('checkOutDate')?.trim();
    const hasDates = Boolean(checkIn && checkOut);

    if (!bookingId && !hasDates) {
      navigate('/', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <MainLayout>
      <GuestForm />
    </MainLayout>
  );
}
