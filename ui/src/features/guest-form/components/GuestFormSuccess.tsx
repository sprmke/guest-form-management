import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileCheck } from 'lucide-react';

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
      <div className="space-y-8 w-full max-w-md p-8 bg-card rounded-2xl shadow-hard border-2 border-border/50">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-success/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative bg-success/10 p-6 rounded-full">
              <CheckCircle2 className="w-16 h-16 text-success" strokeWidth={2} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            Submission Successful!
          </h1>
          
          <p className="text-lg font-medium text-primary">
            Thank you for booking with us, Ka-Homies!
          </p>

          <div className="p-4 bg-muted/50 rounded-lg border-2 border-border/30">
            <p className="text-sm text-muted-foreground">
              Please return to our Facebook page and let us know that you've completed the form. 
              We'll review your submission and get back to you soon!
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleViewForm}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <FileCheck className="mr-2 w-5 h-5" />
            View or Update Form
          </Button>
        </div>
      </div>
    </div>
  );
}
