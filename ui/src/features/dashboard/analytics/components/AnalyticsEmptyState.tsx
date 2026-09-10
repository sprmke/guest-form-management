import { BarChart3 } from 'lucide-react';

type Props = {
  sampleSize: number;
};

const MIN_SAMPLE_SIZE = 10;

export function AnalyticsEmptyState({ sampleSize }: Props) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 p-8 text-center sm:p-12">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <BarChart3 className="text-muted-foreground size-6" aria-hidden />
      </div>
      <div>
        <p className="text-foreground text-sm font-semibold">Not enough booking history yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Analytics unlocks once this property has {MIN_SAMPLE_SIZE} completed or upcoming bookings
          ({sampleSize} so far).
        </p>
      </div>
    </div>
  );
}
