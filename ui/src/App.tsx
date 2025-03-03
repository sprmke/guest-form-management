import { GuestForm } from './components/GuestForm'

function App() {
  return (
    <main className="px-8 pt-12 pb-24 min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold">Guest Form</h1>
        <GuestForm />
      </div>
    </main>
  )
}

export default App