import { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-[150px] md:h-[200px] w-full">
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover"
          style={{
            backgroundImage: `url('/images/hero-banner.png')`,
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="flex relative flex-col justify-center items-center h-full">
            <h1 className="px-4 text-2xl font-bold leading-none text-center text-white md:text-5xl">
              Kame Home - Azure North
            </h1>
            <p className="text-lg text-white md:text-2xl">Guest Advise Form</p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-8 pt-8 pb-20 md:pt-12">
        <div className="mx-auto max-w-2xl">{children}</div>
      </div>
    </main>
  );
}
