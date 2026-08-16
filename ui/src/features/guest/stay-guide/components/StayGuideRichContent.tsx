const STAY_GUIDE_RICH_TEXT_CLASS = 'stay-guide-rich-text';

const richTextStyles = `
  .${STAY_GUIDE_RICH_TEXT_CLASS} {
    color: #404040;
  }

  .dark .${STAY_GUIDE_RICH_TEXT_CLASS} {
    color: #D4D4D4;
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} h2 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 1.25rem 0 0.75rem;
    letter-spacing: -0.02em;
    color: hsl(var(--primary));
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} h3 {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 1.25rem 0 0.5rem;
    color: hsl(var(--primary));
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} p {
    margin: 0 0 1rem;
    line-height: 1.75;
    color: #404040;
  }

  .dark .${STAY_GUIDE_RICH_TEXT_CLASS} p {
    color: #D4D4D4;
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} p + h3,
  .${STAY_GUIDE_RICH_TEXT_CLASS} ul + h3,
  .${STAY_GUIDE_RICH_TEXT_CLASS} ol + h3 {
    margin-top: 1.5rem;
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} ul,
  .${STAY_GUIDE_RICH_TEXT_CLASS} ol {
    margin: 0 0 1rem;
    padding-left: 1.35rem;
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} ul {
    list-style-type: disc;
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} ol {
    list-style-type: decimal;
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} li {
    display: list-item;
    margin: 0.4rem 0;
    line-height: 1.65;
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} li p {
    margin: 0;
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} ul ul {
    list-style-type: circle;
    margin: 0.25rem 0;
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} a {
    color: hsl(var(--primary));
    text-decoration: underline;
    text-underline-offset: 3px;
    word-break: break-word;
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} img {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 0.75rem;
    margin: 1rem 0;
  }

  .${STAY_GUIDE_RICH_TEXT_CLASS} strong {
    font-weight: 600;
  }
`;

interface StayGuideRichContentProps {
  html: string;
  className?: string;
}

export function StayGuideRichContent({ html, className }: StayGuideRichContentProps) {
  if (!html.trim()) return null;

  return (
    <>
      <style>{richTextStyles}</style>
      <div
        className={[STAY_GUIDE_RICH_TEXT_CLASS, className].filter(Boolean).join(' ')}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
