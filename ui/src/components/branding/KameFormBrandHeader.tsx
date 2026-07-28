const DEFAULT_TITLE = 'Guest Advise Form';
const DEFAULT_LOGO_SRC = '/images/logo.png';

export interface KameFormBrandHeaderProps {
  /** Main heading below the logo. Guest form uses the default. */
  title?: string;
  /** Org team logo from property-scoped settings. Falls back to bundled default. */
  logoSrc?: string | null;
}

/**
 * Kame Home logo (overlapping card top) + title.
 * Ancestor must use `position: relative`.
 */
export function KameFormBrandHeader({ title = DEFAULT_TITLE, logoSrc }: KameFormBrandHeaderProps) {
  const logoUrl = logoSrc?.trim() || DEFAULT_LOGO_SRC;

  return (
    <div className="space-y-6 pt-10 md:pt-14">
      <div className="absolute left-0 right-0 top-[-3.25rem] mx-auto flex justify-center md:top-[-4.25rem]">
        <div className="bg-card shadow-elevated ring-card rounded-full p-1 ring-4">
          <img
            src={logoUrl}
            alt="Kame Home"
            className="h-[88px] w-[88px] rounded-full object-cover md:h-[120px] md:w-[120px]"
          />
        </div>
      </div>
      <div className="text-center">
        <p className="section-eyebrow mb-2">Monaco 2604 · Azure North</p>
        <h2 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      </div>
    </div>
  );
}
