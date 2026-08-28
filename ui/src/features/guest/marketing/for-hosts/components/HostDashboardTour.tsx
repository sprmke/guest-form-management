import { HostDashboardTourPlayer } from '@/features/guest/marketing/for-hosts/components/HostDashboardTourPlayer';

export function HostDashboardTour() {
  return (
    <div id="features" className="scroll-mt-24 pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-9 max-w-3xl text-center sm:mb-12">
          <p className="text-primary mb-3 text-xs font-bold uppercase tracking-[0.2em]">
            One workspace, every moving part
          </p>
          <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Watch a booking become a business
          </h2>
        </div>

        <HostDashboardTourPlayer variant="marketing" />
      </div>
    </div>
  );
}
