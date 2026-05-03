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
      <img
        src="/images/logo.png"
        alt="Kame Home"
        className="absolute left-0 right-0 top-[-3.5rem] mx-auto w-[120px] rounded-full border-4 border-white md:top-[-4.5rem] md:w-[160px]"
      />
      <h2 className="text-center text-2xl font-bold text-primary md:text-3xl">
        {title}
      </h2>
    </div>
  );
}
