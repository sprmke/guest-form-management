export type GuestChatFaq = {
  id: string;
  prompt: string;
};

/**
 * Pre-booking listing questions grounded in guest-safe property facts
 * (check-in, parking, pets, payments, house rules — see inboxAiGuestContext).
 * No host-ops or action prompts.
 */
export const GUEST_CHAT_FAQS: readonly GuestChatFaq[] = [
  { id: 'g-01', prompt: 'What time is check-in and check-out?' },
  { id: 'g-02', prompt: 'Is parking available?' },
  { id: 'g-03', prompt: 'Are pets allowed?' },
  { id: 'g-04', prompt: 'Is there WiFi?' },
  { id: 'g-05', prompt: 'How do I get to the property?' },
  { id: 'g-06', prompt: "What's the cancellation policy?" },
  { id: 'g-07', prompt: 'Is there a security deposit?' },
  { id: 'g-08', prompt: 'Can I check in early?' },
  { id: 'g-09', prompt: 'What amenities are included?' },
  { id: 'g-10', prompt: 'How do I book this stay?' },
  { id: 'g-11', prompt: 'What payment methods do you accept?' },
  { id: 'g-12', prompt: 'Are there house rules I should know?' },
  { id: 'g-13', prompt: 'Is self check-in available?' },
  { id: 'g-14', prompt: 'How many guests can stay?' },
  { id: 'g-15', prompt: 'Can I check out late?' },
  { id: 'g-16', prompt: 'Do you accept GCash?' },
];

export const GUEST_CHAT_FAQ_VISIBLE_COUNT = 5;

export function pickRandomGuestChatFaqs(
  count: number = GUEST_CHAT_FAQ_VISIBLE_COUNT
): GuestChatFaq[] {
  const copy = [...GUEST_CHAT_FAQS];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
