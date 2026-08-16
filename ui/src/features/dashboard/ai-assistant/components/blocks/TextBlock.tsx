export function TextBlock({ text }: { text: string }) {
  return <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{text}</p>;
}
