import type { Options } from 'html-to-image';

/** Cross-origin Google Fonts stylesheets throw when html-to-image reads cssRules. */
export function marketingHtmlToImageOptions(overrides: Options = {}): Options {
  return {
    skipFonts: true,
    ...overrides,
  };
}
