const DEFAULT_TITLE = 'Guest Advise Form';

export interface KameFormBrandHeaderProps {
  /** Main heading below the logo. Guest form uses the default. */
  title?: string;
}

/**
 * Kame Home logo (overlapping card top) + title.
 * Ancestor must use `position: relative`.
 */
export function KameFormBrandHeader({
  title = DEFAULT_TITLE,
}: KameFormBrandHeaderProps) {
  return (
    <div className="space-y-6 pt-10 md:pt-14">
      <div className="absolute left-0 right-0 top-[-3.25rem] mx-auto flex justify-center md:top-[-4.25rem]">
        <div className="rounded-full bg-card p-1 shadow-elevated ring-4 ring-card">
          <img
            src="/images/logo.png"
            alt="Kame Home"
            className="h-[88px] w-[88px] rounded-full object-cover md:h-[120px] md:w-[120px]"
          />
        </div>
      </div>
      <div className="text-center">
        <p className="section-eyebrow mb-2">Monaco 2604 · Azure North</p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {title}
        </h2>
      </div>
    </div>
  );
}
