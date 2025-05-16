import { GuestForm } from './components/GuestForm';

function App() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-[150px] md:h-[200px] w-full">
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')",
          }}
        >
          <div className="absolute inset-0 bg-black/50" /> {/* Overlay */}
          <div className="flex relative flex-col justify-center items-center h-full">
            <h1 className="px-4 text-2xl font-bold text-center text-white md:text-5xl">
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
