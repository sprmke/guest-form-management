# Pricing — legacy route

Route: `/org/:orgSlug/property/:propertySlug/pricing`

> **Status:** Redirect — replaced by the Calendar Pricing view.

This legacy URL redirects to
`/org/:orgSlug/property/:propertySlug/calendar?view=pricing` with `replace`, so it does not
add an extra browser-history entry.

The pricing UI, permissions, fields, save paths, booking workflow integration, and
owner-managed date blocks are documented in the
[Calendar operator guide](./calendar.md).
