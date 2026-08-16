import { useState } from 'react';

import { Sparkles } from 'lucide-react';


import { AiAssistantPanel } from '@/features/dashboard/ai-assistant/components/AiAssistantPanel';
import { useAiAssistantAccess } from '@/features/dashboard/ai-assistant/hooks/useAiAssistantAccess';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

/** Mounted once in AdminLayout — visible only when both kill-switch layers are on for this org. */
export function AiAssistantLauncherButton() {
  const propertyId = usePropertyIdParam();
  const { accessible } = useAiAssistantAccess(propertyId);
  const [open, setOpen] = useState(false);

  if (!accessible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI assistant"
        className="gradient-primary text-primary-foreground shadow-elevated-lg fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex min-h-[52px] min-w-[52px] items-center justify-center rounded-full transition-transform hover:scale-105"
      >
        <Sparkles className="h-5 w-5" aria-hidden />
      </button>
      <AiAssistantPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
