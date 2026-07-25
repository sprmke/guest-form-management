import { Link, Outlet, useLocation } from 'react-router-dom';

import {
  Building2,
  Calendar,
  CreditCard,
  Users,
  Home,
  Search,
  Star,
  ShieldCheck,
} from 'lucide-react';

import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LogoIcon } from '@/components/ui/icons';

const HOST_AUTH_PREFIX = '/for-hosts/';

function AuthBrandingPanel() {
  const { pathname } = useLocation();
  const isHostMode = pathname.startsWith(HOST_AUTH_PREFIX);

  if (isHostMode) {
    return (
      <div className="relative z-10 flex h-full flex-col p-10">
        <Link to="/for-hosts" className="group flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/20 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-105">
            <LogoIcon className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Kame Homes</span>
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center px-8">
          <div className="max-w-lg text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
              <Building2 className="h-4 w-4" />
              <span>For property hosts & managers</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
              Property management
              <br />
              <span className="text-white/90">made simple</span>
            </h1>
            <p className="mb-12 text-lg leading-relaxed text-white/85">
              The all-in-one platform for property managers. Streamline bookings, track payments,
              and delight your guests.
            </p>
          </div>

          <div className="grid w-full max-w-md grid-cols-2 gap-4">
            <FeatureItem
              icon={<Building2 className="h-5 w-5" />}
              title="Multi-Property"
              description="Manage all your properties"
            />
            <FeatureItem
              icon={<Calendar className="h-5 w-5" />}
              title="Smart Calendar"
              description="Visual booking management"
            />
            <FeatureItem
              icon={<CreditCard className="h-5 w-5" />}
              title="Payments"
              description="Track income & expenses"
            />
            <FeatureItem
              icon={<Users className="h-5 w-5" />}
              title="Team Roles"
              description="Collaborate with ease"
            />
          </div>

          <div className="mt-16 flex w-full max-w-md items-center justify-center gap-12 border-t border-white/20 pt-12">
            <StatItem value="500+" label="Properties" />
            <StatItem value="10k+" label="Bookings" />
            <StatItem value="99.9%" label="Uptime" />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-white/70">
          <p>© 2026 Kame Homes</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-full flex-col p-10">
      <Link to="/" className="group flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/20 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-105">
          <LogoIcon className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">Kame Homes</span>
      </Link>

      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <div className="max-w-lg text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
            <Home className="h-4 w-4" />
            <span>Browse & book properties</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
            Find your perfect
            <br />
            <span className="text-white/90">place to stay</span>
          </h1>
          <p className="mb-12 text-lg leading-relaxed text-white/85">
            Discover handpicked properties across the Philippines. Book with confidence and enjoy a
            seamless stay from check-in to check-out.
          </p>
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-4">
          <FeatureItem
            icon={<Search className="h-5 w-5" />}
            title="Easy Discovery"
            description="Browse hundreds of listings"
          />
          <FeatureItem
            icon={<Calendar className="h-5 w-5" />}
            title="Instant Booking"
            description="Reserve your dates in seconds"
          />
          <FeatureItem
            icon={<Star className="h-5 w-5" />}
            title="Verified Stays"
            description="Curated quality properties"
          />
          <FeatureItem
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Secure & Safe"
            description="Protected booking process"
          />
        </div>

        <div className="mt-16 flex w-full max-w-md items-center justify-center gap-12 border-t border-white/20 pt-12">
          <StatItem value="500+" label="Properties" />
          <StatItem value="4.9★" label="Avg. Rating" />
          <StatItem value="10k+" label="Happy Guests" />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-white/70">
        <p>© 2026 Kame Homes</p>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="transition-colors hover:text-white">
            Privacy
          </Link>
          <Link to="/terms" className="transition-colors hover:text-white">
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/20">
      <div className="mb-2 flex items-center gap-3">
        <div className="text-white">{icon}</div>
        <span className="font-medium text-white">{title}</span>
      </div>
      <p className="text-sm text-white/75">{description}</p>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-white/70">{label}</div>
    </div>
  );
}

export function AuthLayout() {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="relative hidden flex-col overflow-hidden lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-500" />
        <div className="absolute left-0 top-0 h-[600px] w-[600px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-white/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] translate-x-1/4 translate-y-1/4 rounded-full bg-white/20 blur-[100px]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/15 blur-[80px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <AuthBrandingPanel />
      </div>

      <div className="bg-background flex min-h-screen flex-col">
        <div className="flex items-center justify-between border-b p-4 lg:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="bg-primary shadow-primary/20 flex h-9 w-9 items-center justify-center rounded-xl shadow-lg">
              <LogoIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">Kame Homes</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="hidden justify-end p-6 lg:flex">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-[420px]">
            <Outlet />
          </div>
        </div>

        <div className="text-muted-foreground p-4 text-center text-sm lg:hidden">
          <p>© 2026 Kame Homes. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
