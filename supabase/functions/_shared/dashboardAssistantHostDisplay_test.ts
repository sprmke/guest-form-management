import {
  collectHostDisplayRefs,
  finalizeAssistantBlocksForHost,
  formatBookingHostLabel,
  humanizeQuickActions,
  isTechnicalEntityLabel,
  rewriteTextWithHostRefs,
} from './dashboardAssistantHostDisplay.ts';

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

Deno.test('formatBookingHostLabel uses guest, stay range, and status', () => {
  assertEqual(
    formatBookingHostLabel({
      guestName: 'Jane Doe',
      checkIn: '08-19-2026',
      checkOut: '08-22-2026',
      statusLabel: 'Pending Review',
    }),
    'Jane Doe · Aug 19–Aug 22 · Pending Review',
    'booking label'
  );
});

Deno.test('humanizeQuickActions maps technical booking chips by order', () => {
  const refs = collectHostDisplayRefs([
    {
      ok: true,
      data: {
        bookings: [
          {
            bookingId: '4727',
            guestName: 'Maria Santos',
            checkIn: '08-19-2026',
            checkOut: '08-20-2026',
          },
          {
            bookingId: '4728',
            guestName: 'Pedro Cruz',
            checkIn: '08-21-2026',
            checkOut: '08-23-2026',
          },
        ],
      },
    },
  ]);

  const actions = humanizeQuickActions(
    [
      { label: 'Booking 4727', prompt: 'Mark booking 4727 complete' },
      { label: 'Booking 4728', prompt: 'Mark booking 4728 complete' },
    ],
    refs
  );

  assertEqual(actions[0].label, 'Maria Santos · Aug 19–Aug 20', 'first chip');
  assertEqual(actions[1].label, 'Pedro Cruz · Aug 21–Aug 23', 'second chip');
  assertEqual(actions[0].prompt.includes('Maria Santos'), true, 'prompt uses guest name');
});

Deno.test('isTechnicalEntityLabel flags booking ids', () => {
  assertEqual(isTechnicalEntityLabel('Booking 4727'), true, 'booking number');
  assertEqual(isTechnicalEntityLabel('Maria · Aug 19–20'), false, 'host label');
});

Deno.test('humanizeQuickActions maps fabricated booking numbers by order', () => {
  const refs = collectHostDisplayRefs([
    {
      total: 2,
      bookings: [
        {
          bookingId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee4069',
          hostLabel: 'Maria Santos · Aug 19–Aug 20',
          guestName: 'Maria Santos',
          checkIn: '08-19-2026',
          checkOut: '08-20-2026',
        },
        {
          bookingId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee4070',
          hostLabel: 'Pedro Cruz · Aug 21–Aug 23',
          guestName: 'Pedro Cruz',
          checkIn: '08-21-2026',
          checkOut: '08-23-2026',
        },
      ],
    },
  ]);

  const actions = humanizeQuickActions(
    [
      { label: 'Booking 4069', prompt: 'Mark booking 4069 complete' },
      { label: 'Booking 4070', prompt: 'Mark booking 4070 complete' },
    ],
    refs
  );

  assertEqual(actions[0].label, 'Maria Santos · Aug 19–Aug 20', 'first chip by order');
  assertEqual(actions[1].label, 'Pedro Cruz · Aug 21–Aug 23', 'second chip by order');
});

Deno.test('humanizeQuickActions drops unresolved technical chips', () => {
  const actions = humanizeQuickActions(
    [
      { label: 'Booking 4069', prompt: 'Mark booking 4069 complete' },
      { label: 'Booking 4070', prompt: 'Mark booking 4070 complete' },
    ],
    []
  );
  assertEqual(actions.length, 0, 'no chips without refs');
});

Deno.test('humanizeQuickActions rebuilds chips from booking refs', () => {
  const refs = collectHostDisplayRefs([
    {
      bookings: [
        {
          bookingId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee4069',
          hostLabel: 'Maria Santos · Aug 19–Aug 20',
          guestName: 'Maria Santos',
          checkIn: '08-19-2026',
          checkOut: '08-20-2026',
        },
        {
          bookingId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee4070',
          hostLabel: 'Pedro Cruz · Aug 21–Aug 23',
          guestName: 'Pedro Cruz',
          checkIn: '08-21-2026',
          checkOut: '08-23-2026',
        },
      ],
    },
  ]);
  const actions = humanizeQuickActions(
    [
      { label: 'Booking 4069', prompt: 'x' },
      { label: 'Booking 4070', prompt: 'y' },
      { label: 'Booking 4071', prompt: 'z' },
    ],
    refs
  );
  assertEqual(actions.length, 2, 'chip count');
  assertEqual(actions[0].label, 'Maria Santos · Aug 19–Aug 20', 'first');
  assertEqual(actions[1].label, 'Pedro Cruz · Aug 21–Aug 23', 'second');
});

Deno.test('finalizeAssistantBlocksForHost never leaves an empty answer', () => {
  const blocks = finalizeAssistantBlocksForHost(
    [
      {
        type: 'activity_timeline',
        entries: [
          {
            id: '1',
            phase: 'understanding',
            label: 'Understood your question',
            status: 'done',
          },
        ],
      },
      {
        type: 'quick_actions',
        actions: [
          { label: 'Booking 4069', prompt: 'x' },
          { label: 'Booking 4070', prompt: 'y' },
        ],
      },
    ],
    []
  );
  const text = blocks.find((block) => block.type === 'text');
  assertEqual(
    Boolean(text && text.type === 'text' && text.text.includes('Which record')),
    true,
    'fallback text'
  );
  assertEqual(
    blocks.some((block) => block.type === 'quick_actions'),
    false,
    'no unresolved technical chips'
  );
});

Deno.test('finalizeAssistantBlocksForHost rebuilds chips from tool bookings', () => {
  const blocks = finalizeAssistantBlocksForHost(
    [
      {
        type: 'quick_actions',
        actions: [
          { label: 'Booking 4069', prompt: 'x' },
          { label: 'Booking 4070', prompt: 'y' },
        ],
      },
    ],
    [
      {
        bookings: [
          {
            bookingId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee4069',
            hostLabel: 'Maria Santos · Aug 19–Aug 20',
            guestName: 'Maria Santos',
            checkIn: '08-19-2026',
            checkOut: '08-20-2026',
          },
        ],
      },
    ]
  );
  const chips = blocks.find((block) => block.type === 'quick_actions');
  assertEqual(chips?.type === 'quick_actions', true, 'has chips');
  if (chips?.type === 'quick_actions') {
    assertEqual(chips.actions[0].label, 'Maria Santos · Aug 19–Aug 20', 'host label chip');
  }
});

Deno.test('rewriteTextWithHostRefs replaces uuid tokens', () => {
  const id = 'a1111111-1111-4111-8111-111111111111';
  const refs = collectHostDisplayRefs([
    {
      bookingId: id,
      guestName: 'Alex Kim',
      checkIn: '09-01-2026',
      checkOut: '09-03-2026',
    },
  ]);
  const text = rewriteTextWithHostRefs(`Open booking ${id} for review`, refs);
  assertEqual(text.includes('Alex Kim'), true, 'uuid replaced');
});
