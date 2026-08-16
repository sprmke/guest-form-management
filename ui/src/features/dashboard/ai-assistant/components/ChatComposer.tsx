import { useState } from 'react';

import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatComposer({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <div className="border-border/60 flex items-end gap-2 border-t p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask about bookings, finance, or maintenance…"
        rows={1}
        disabled={disabled}
        className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring max-h-32 min-h-[44px] flex-1 resize-none rounded-lg border px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2"
      />
      <Button
        size="icon"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="min-h-[44px] min-w-[44px] shrink-0"
      >
        <Send className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
