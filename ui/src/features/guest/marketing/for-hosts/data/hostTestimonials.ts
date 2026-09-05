export const hostTestimonials = [
  {
    id: 1,
    name: 'Ana Dela Cruz',
    role: 'Host, 4 properties · Tagaytay',
    quote:
      'The status pipeline plus inbound approval email means GAF and pet documents clear themselves overnight. I used to spend my mornings checking inboxes. Now I just check the dashboard.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Marco Villanueva',
    role: 'Host, beachfront villa · Boracay',
    quote:
      'Guest conversations stay together, and the AI prepares a reply while I am still reading the message. I can review and send without jumping between tools.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Liza Fernandez',
    role: 'Property manager, 12 units · Metro Manila',
    quote:
      'Owners ask for statements constantly. Now I export a PDF from the finance dashboard in under a minute instead of rebuilding a spreadsheet every month.',
    rating: 5,
  },
  {
    id: 4,
    name: 'Paolo Reyes',
    role: 'Host & parking operator · Cebu',
    quote:
      'Running a property and a parking lot used to mean two different systems. Parking is its own thing here but stays one login, one dashboard.',
    rating: 4,
  },
  {
    id: 5,
    name: 'Grace Tan',
    role: 'Host, Airbnb + direct bookings',
    quote:
      'I built a month of Instagram posts and a reel in the Marketing Studio in one afternoon. No designer, no video editor, just the built-in calendar and templates.',
    rating: 5,
  },
] as const;

export type HostTestimonial = (typeof hostTestimonials)[number];
