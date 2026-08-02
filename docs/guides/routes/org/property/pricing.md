---
title: 'Pricing — legacy route'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-02
---

# Pricing — legacy route

Route: `/org/:orgSlug/property/:propertySlug/pricing`

> **Status:** Redirect — replaced by the Calendar Pricing view.

This legacy URL redirects to `/org/:orgSlug/property/:propertySlug/calendar` with
`replace`, so it does not add an extra browser-history entry.

The pricing UI, permissions, fields, save paths, and owner-managed date blocks are
documented in the [Calendar operator guide](./calendar.md). Its
[Booking workflow integration](./calendar.md#booking-workflow-integration) subsection
explains how Calendar Pricing defaults feed booking review; the full workflow UI is in the
[booking detail operator guide](./bookings-detail.md#progress-panel).
