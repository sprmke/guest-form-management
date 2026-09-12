import { assert, assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';

import {
  AI_SUGGEST_FALLBACK_REPLY,
  assertSafeGuestReply,
  classifyGuestInquiryIntent,
} from './inboxAiSafetyGuard.ts';

Deno.test('classifyGuestInquiryIntent — sensitive guest list request', () => {
  assertEquals(
    classifyGuestInquiryIntent('Who else is staying at the property this week?'),
    'sensitive'
  );
});

Deno.test('classifyGuestInquiryIntent — normal pricing question', () => {
  assertEquals(classifyGuestInquiryIntent('What is the rate for tonight?'), 'normal');
});

Deno.test('assertSafeGuestReply — blocks other guest names', () => {
  const result = assertSafeGuestReply({
    draftText: 'James Lim is also checked in on your dates.',
    guestMessage: 'Is parking included?',
    allowedFacts: { pricingValues: [] },
    participantName: 'Maria Santos',
    otherGuestNames: ['James Lim'],
  });
  assertEquals(result.safe, false);
  if (!result.safe) {
    assert(result.reason.includes('James Lim'));
  }
});

Deno.test('assertSafeGuestReply — allows grounded pricing amount', () => {
  const result = assertSafeGuestReply({
    draftText: 'The nightly rate is ₱3,500.',
    guestMessage: 'How much per night?',
    allowedFacts: { pricingValues: [3500] },
  });
  assertEquals(result.safe, true);
});

Deno.test('assertSafeGuestReply — blocks ungrounded pricing', () => {
  const result = assertSafeGuestReply({
    draftText: 'The nightly rate is ₱9,999.',
    guestMessage: 'How much per night?',
    allowedFacts: { pricingValues: [3500] },
  });
  assertEquals(result.safe, false);
});

Deno.test('assertSafeGuestReply — sensitive inquiry with refusal is safe', () => {
  const result = assertSafeGuestReply({
    draftText: "I can't share other guest details for privacy. I'll check with the host team.",
    guestMessage: 'Who else booked this weekend?',
    allowedFacts: { pricingValues: [] },
  });
  assertEquals(result.safe, true);
});

Deno.test('AI_SUGGEST_FALLBACK_REPLY is non-empty', () => {
  assert(AI_SUGGEST_FALLBACK_REPLY.trim().length > 0);
});
