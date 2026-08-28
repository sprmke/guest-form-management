/** Scroll the showcase root (embed / Page Editor) or the document on live guest pages. */
export function scrollShowcaseToTop(behavior: ScrollBehavior = 'smooth') {
  const root =
    document.querySelector<HTMLElement>('[data-showcase-scroll-root]') ??
    document.querySelector<HTMLElement>('.showcase-scope');

  if (root) {
    root.scrollTo({ top: 0, behavior });
    return;
  }

  window.scrollTo({ top: 0, behavior });
}
