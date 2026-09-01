const capabilities = [
  { value: '14', label: 'connected modules' },
  { value: '1', label: 'booking workflow' },
  { value: 'AI', label: 'assisted review' },
  { value: '24/7', label: 'background automation' },
];

export function HostCapabilityStrip() {
  return (
    <section className="border-border bg-background border-y" aria-label="Platform capabilities">
      <div className="container mx-auto grid grid-cols-2 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {capabilities.map((capability, index) => (
          <div
            key={capability.label}
            className={`py-6 text-center sm:py-7 ${
              index % 2 === 0
                ? 'border-border border-r lg:border-r'
                : index !== 3
                  ? 'lg:border-border lg:border-r'
                  : ''
            }`}
          >
            <p className="text-foreground text-2xl font-black tabular-nums tracking-tight sm:text-3xl">
              {capability.value}
            </p>
            <p className="text-muted-foreground mt-1 text-xs font-medium sm:text-sm">
              {capability.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
