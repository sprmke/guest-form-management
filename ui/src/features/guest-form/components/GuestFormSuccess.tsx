import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function GuestFormSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const handleViewForm = () => {
    if (bookingId) {
      navigate(`/?bookingId=${bookingId}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 text-center">
      <div className="space-y-6 w-full max-w-md">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          Thanks for booking with us Ka-Homies!
        </h1>

        <p className="text-gray-500">
          Please return to our Facebook page and let us know that you've
          completed the form.
        </p>
        <div className="space-y-4">
          <Button
            onClick={handleViewForm}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            View or Update Form
          </Button>
        </div>
      </div>
    </div>
  );
}
