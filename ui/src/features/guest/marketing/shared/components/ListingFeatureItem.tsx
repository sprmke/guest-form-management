import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function ListingFeatureItem({ icon: Icon, title, description }: Props) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0">
        <Icon className="text-foreground h-6 w-6" aria-hidden />
      </div>
      <div>
        <p className="text-foreground font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
