import { ReactNode } from 'react';
import { Calendar, MapPin } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Hero Section with Modern Overlay */}
      <div className="relative h-[200px] md:h-[280px] w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover"
          style={{
            backgroundImage: `url('/images/hero-banner.png')`,
          }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/30 to-primary/85" />

          {/* Pattern Overlay for Texture */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
      </div>

      {/* Content Section with Enhanced Styling */}
      <div className="relative px-4 -mt-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border backdrop-blur-sm bg-card shadow-hard border-border/50">
            {children}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-xs text-center text-muted-foreground">
        <p>© 2025 Kame Home - Azure North. All rights reserved.</p>
      </footer>
    </main>
  );
}
