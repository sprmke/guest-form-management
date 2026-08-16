/** Cross-component signal to open the AI assistant panel from outside AdminLayoutShell (e.g. Help & Support). */

let requestId = 0;
const listeners = new Set<() => void>();

export function openAiAssistant(): void {
  requestId += 1;
  for (const listener of listeners) listener();
}

export function subscribeAssistantOpenRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAssistantOpenRequestId(): number {
  return requestId;
}
