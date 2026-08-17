import { humanizeAssistantStatusText } from '@/features/dashboard/ai-assistant/lib/chatBlockDisplay';

export function TextBlock({ text }: { text: string }) {
  return (
    <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
      {humanizeAssistantStatusText(text)}
    </p>
  );
}
