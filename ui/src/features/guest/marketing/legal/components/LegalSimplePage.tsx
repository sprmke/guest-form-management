interface LegalSection {
  title: string;
  paragraphs: string[];
}

interface LegalSimplePageProps {
  title: string;
  description: string;
  sections: LegalSection[];
}

export function LegalSimplePage({ title, description, sections }: LegalSimplePageProps) {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-foreground mb-4 text-3xl font-bold tracking-tight lg:text-4xl">
          {title}
        </h1>
        <p className="text-muted-foreground text-lg">{description}</p>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-foreground mb-3 text-xl font-semibold">{section.title}</h2>
            <div className="text-muted-foreground space-y-3 leading-7">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
