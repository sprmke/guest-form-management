import { HostDashboardTourPlayer } from '@/features/guest/marketing/for-hosts/components/HostDashboardTourPlayer';
import { Eyebrow } from '@/features/guest/marketing/for-hosts/preview/components/Eyebrow';
import { Reveal } from '@/features/guest/marketing/for-hosts/preview/components/Reveal';

/**
 * The full narrated product tour. Keeps the existing Remotion player (`variant="marketing"`);
 * only the framing around it is part of the redesign. `id="features"` matches the marketing
 * nav anchor and the "full tour" links elsewhere on the page.
 */
export function VideoTourSection() {
  return (
    <section
      id="features"
      className="bg-muted/40 border-border scroll-mt-24 border-y py-16 sm:py-20 lg:py-24"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <Eyebrow>The full tour</Eyebrow>
          <h2 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Every screen a host touches, in three minutes
          </h2>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            A narrated walkthrough of all 19 features — the portfolio view, the booking pipeline,
            pricing, finance, the guest inbox, marketing, and the AI assistant. Pause any chapter,
            or jump straight to the one you care about.
          </p>
        </Reveal>

        <Reveal y={24} className="mt-12">
          <HostDashboardTourPlayer variant="marketing" />
        </Reveal>
      </div>
    </section>
  );
}
