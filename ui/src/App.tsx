import { GuestForm } from './components/GuestForm';

function App() {
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
          <div className="absolute inset-0 bg-black/50" /> {/* Overlay */}
          <div className="flex relative flex-col justify-center items-center h-full">
            <h1 className="px-4 text-2xl font-bold leading-none text-center text-white md:text-5xl">
              Kame Home - Azure North
            </h1>
            <p className="text-lg text-white md:text-2xl">Guest Advise Form</p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="px-8 pt-12 pb-24">
        <div className="mx-auto max-w-2xl">
          <GuestForm />
        </div>
      </div>
    </main>
  );
}

export default App;
