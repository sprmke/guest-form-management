export type AssistantSuggestionKind = 'question' | 'action';

export type AssistantSuggestion = {
  id: string;
  kind: AssistantSuggestionKind;
  prompt: string;
};

/** Read-only prompts mapped to the assistant's Tier-0 tools. */
export const ASSISTANT_QUESTIONS: AssistantSuggestion[] = [
  { id: 'q-01', kind: 'question', prompt: "Who's checking in today?" },
  { id: 'q-02', kind: 'question', prompt: "Who's checking out today?" },
  { id: 'q-03', kind: 'question', prompt: 'How many bookings are pending review?' },
  { id: 'q-04', kind: 'question', prompt: 'Which bookings are waiting on documents?' },
  { id: 'q-05', kind: 'question', prompt: "What's my occupancy this month?" },
  { id: 'q-06', kind: 'question', prompt: 'What dates are still open this month?' },
  { id: 'q-07', kind: 'question', prompt: "What's this month's income and expenses?" },
  { id: 'q-08', kind: 'question', prompt: 'Which stays still have a balance due?' },
  { id: 'q-09', kind: 'question', prompt: 'What maintenance is still open?' },
  { id: 'q-10', kind: 'question', prompt: 'What does Pending Documents mean?' },
  { id: 'q-11', kind: 'question', prompt: 'Why is this booking stuck?' },
  { id: 'q-12', kind: 'question', prompt: 'What can I do next with this booking?' },
  { id: 'q-13', kind: 'question', prompt: 'Tell me about this booking' },
  { id: 'q-14', kind: 'question', prompt: 'How many check-ins are coming this week?' },
  { id: 'q-15', kind: 'question', prompt: 'Which bookings are ready for check-in?' },
  { id: 'q-16', kind: 'question', prompt: "What's the maintenance summary this month?" },
  { id: 'q-17', kind: 'question', prompt: "Show this month's finance by booking" },
  { id: 'q-18', kind: 'question', prompt: 'What statuses can this booking move to?' },
  { id: 'q-19', kind: 'question', prompt: 'How does the booking workflow work?' },
  { id: 'q-20', kind: 'question', prompt: 'Which bookings are ready for check-out?' },
];

/**
 * Write prompts mapped to `run_receipt_validation`, `propose_transition_booking`,
 * and `propose_cancel_booking`. Risky ones still require Confirm in chat.
 */
export const ASSISTANT_ACTIONS: AssistantSuggestion[] = [
  { id: 'a-01', kind: 'action', prompt: 'Move this booking to the next status' },
  { id: 'a-02', kind: 'action', prompt: 'Approve this booking' },
  { id: 'a-03', kind: 'action', prompt: 'Move this booking to Pending Documents' },
  { id: 'a-04', kind: 'action', prompt: 'Move this booking to Ready for Check-in' },
  { id: 'a-05', kind: 'action', prompt: 'Move this booking to Ready for Check-out' },
  { id: 'a-06', kind: 'action', prompt: 'Start the SD refund for this booking' },
  { id: 'a-07', kind: 'action', prompt: 'Mark this booking as completed' },
  { id: 'a-08', kind: 'action', prompt: 'Cancel this booking' },
  { id: 'a-09', kind: 'action', prompt: 'Re-run receipt validation on this booking' },
  { id: 'a-10', kind: 'action', prompt: 'Unblock this booking' },
  { id: 'a-11', kind: 'action', prompt: 'Mark documents as received and move forward' },
  { id: 'a-12', kind: 'action', prompt: 'Ready this booking for check-in' },
  { id: 'a-13', kind: 'action', prompt: 'Ready this booking for check-out' },
  { id: 'a-14', kind: 'action', prompt: 'Complete check-out for this guest' },
  { id: 'a-15', kind: 'action', prompt: 'Finalize the security deposit refund' },
  { id: 'a-16', kind: 'action', prompt: 'Move this booking back to Pending Review' },
  { id: 'a-17', kind: 'action', prompt: 'Close out this booking' },
  { id: 'a-18', kind: 'action', prompt: "Re-check this booking's payment receipts" },
  { id: 'a-19', kind: 'action', prompt: 'Skip to Ready for Check-in' },
  { id: 'a-20', kind: 'action', prompt: 'Cancel and stop this booking' },
];

export const SUGGESTION_VISIBLE_COUNT = 5;

export function pickRandomSuggestions<T>(items: readonly T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
