---
title: 'Tasks To Prompt'
status: archived
tags: [planning]
updated: 2026-08-11
---

**Status legend:** ✅ done · 🚧 in progress · 📋 planned (plan doc written) · 🔵 pending / open · ❌ cancelled / won't do

===

✅ Expand Inbox module to both org and property levels

Right now, we only have Inbox module at org level.

We should expand it and we should have menu and pages on property level.

The only differences are:

At org level:

- Web chat - we can display all property web chats and conversations. We have a view property link that redirects us to property dashboard
- Facebook/Instagram - this would be the default meta account. if user connect their meta account at org level, this should be reused and be the default meta account for all properties inbox module. Meaning, when we visit all properties, we will have automatically connected and reused meta account per property. Unless they manually connect to different meta account on specific properties. The initial connected meta account should be used and be the default meta account to all properties & parkings.

At property level:

- Web chat - scoped and only display the chat and conversations under specific property.
- Facebook/Instagram - we can connect different meta account per property.

Plan: `docs/workflow/done/inbox-org-property-parking.md` (includes parking)

===

✅ Support both property and parking bookings in /bookings module at org level.

We need to update /bookings module at org level to display info and available actions for both properties & parking.
Right now, only properties are working and visible there.
Adjust all views (table, card, calendar) to display properties & parking info and make sure all filters, and any supported functions for both module will work correctly.
Maybe at org level, we can remove the kanban board because we don't have workflow for parking bookings.

We should also update the stat cards, filters, and any actions available on bookings module at org level.
The end goal is that we should support both properties & parking modules in bookings module at org level.

===

🔵 Socials at org and property level

We should refine how we can improve the socials management for org and property level to prevent any redundant fill up.
Provide a best UI/UX so that on property/parking level, we have option to reuse the same value of org level per fields.
Maybe, we will offer a global button that if click, we will make all social fields read only and populate it with org values.
Or maybe it's better if we have individual toggle per field? Or support both? Provide the best UI/UX for our scenario.

===

✅ Refine Notifications module

- Shared bot token card (one token for all modules; pre-fills module fields; editable per module)
- Help dialogs (BotFather + chat ID)
- Module card descriptions
- Find chat ID scanner hidden after **Connected**

Original intake:

Let's offer an option to have global bot token which can be used for all modules.
So we will have a first card to input global/reusable bot token and a button to test if token is valid.
Once saved, this will be the default bot token value when a module is enabled, this is still editable and viewable.
But this is better because we can have a one bot token for all notification modules.

Also, on first card, we should have a help button and when we click it, we will provide a very detailed instructions on how to generate telegram bot token.

Then, for each module, when we will also have a help button for chat id, and with same flow, we will provide detailed guide on how to get tg chat id.

Lastly, let's provide card description for each section, for what each module is for.

===

❌ Add main header in dashboard

Won't do — profile, theme toggle, and Explore/Host mode stay in the sidebar footer (`AdminLayout`); separate top header bar rejected.

→ **Won't do:** [`../wont-do/dashboard-top-header-bar.md`](../wont-do/dashboard-top-header-bar.md)

===

✅ Update pricing menu/page to be "Calendar"

We will have different tabs or switch view inside our calendar page.

1. Default View - think of better name. similar with our calendar view in property dashboard where we can toggle view between booked guest info and price view
2. Pricing View - this is the current pricing page to configure pricing per booking. We should also have to support to block booking date

Guide: `docs/guides/routes/org/property/calendar.md`

===

🔵 Improve dashboard UI at org & property level

===

🔵 Display animated popup party when hosts open calendar and we have 20+ bookings this month

===

✅ Make sure all media uploader default image is empty (ex. org logo). Please analyze all our dashboard image uploader and make sure we don't have static or default images that's tied to Kame Home (2604)

===

🔵 Redesign hosts page to be similar UI with developments page.

Maybe add org photos/banner from org settings?

- http://localhost:5173/hosts/kame-homes
- http://localhost:5173/developments/azure-north-residences

===

✅ Do not allow the following names for org and property name.

- Azure North
- Azure North Residence / s (this should be regex)
- Azure North Residence Official
- Azure North Official
- Azure Official
- or contains "Official"

Again, our detector should be smart and use detector, adding pre, post and between characters should not also be allowed. PLease be very smart. We are doing this so that hosts cannot register general names or use the any residence name and disguise as the official or main host/org/property

Make sure we apply this validation on onboarding, settings and all other locations

===

🚧 Branch deployment guide + dev/staging environment

Meaning, I want to deploy our app in vercel with ou current branch with our new changes.

Same for supabase, but instead of having branch deployment with Suapabase which is not free. I want to create new supabase project with different account to intialize and setup everything.

The goal in the end is for us to deploy and see fully working application with our new changes.

Also, another important setup I'd like to have is to point or use supabase deployed dev in our local so that we don't need to run docker from our local to test and work locally. Meaning, when we have any supabase related changes locally, and test our app, I still want to see our changes and fully working on it with our local frontend. Meaning, when we are working locally, we can still work on it without running docker and without deploying our backend/supabase related changes to dev. Then, once good, we can deploy our changes to dev. I'm not sure how is this possible but this is how we do it on other projects and I'd like to implement in our app

→ **Runbook shipped; operator bootstrap pending:** [`../in-progress/ci-cd-environments/dev-staging-environment.md`](../in-progress/ci-cd-environments/dev-staging-environment.md)

===

✅ Redesign property public pages layout/container

I'd like to redesign our property public layout pages to display a header where it contains minimal information like logo, dark mode toggle, and user icon. Reuse existing public header that we have make it minimal to our property public pages (form, calendar, sd refund, etc)

Let's also please cleanup our redirect to dashboard icon button and dark toggle mode that we have on existing pages.

Also, another thing that we need to improve is that we should display or redesign the property info, booking info.

===

✅ Refine all property public pages

→ **Done:** [`../done/public-operational-guest-pages-multi-tenant.md`](../done/public-operational-guest-pages-multi-tenant.md)

===

🔵 Update for-hosts landing page animation section with updated features and more refined text/voice

===

🔵 Improve avatar video animation

===

✅ Make google map view mode in search or public page listing

Shipped: [`../done/google-map-listing-view.md`](../done/google-map-listing-view.md). Real Google Maps on `/properties`, `/developments`, and `/search` category tabs. `/parkings` index map toggle still optional follow-up.

===

🔵 Generate more real world mock data

Generate more real world and hundreds of mock data for different properties, developments, parking, and other type of place so that we can fully test and simulate real world test data and fully verify if our search, filters, lazy load, and any app performance optimization implementation are working properly.

===

🔵 Cleanup unused ui and backend env vars:
EMAIL_TO / EMAIL_REPLY_TO

===

🔵 Update each page browser title to be dynamic.

Public Pages - Kame Homes - ${page name}

Property public pages - ${Property Name} - ${page name}

Dashboard Org Level pages - ${Org Name} - ${page name}
Dashboard App Level pages - ${App Name} - ${page name}

Make sure we have a rule for this every time we update or create new pages.
Update both dashboard and public pages.

I'm sure there are other pages that we need to update to match exactly how we should update their name.
Please list them down and if you have suggestion to name differently or grouped or scoped

===

🔵 UI/UX improvements

- Improve dashboard search, filter, sort and action buttons. Notice how we simplify it on mobile, maybe apply for desktop
- Improve pagination UI/UX
- Add table column sort
- Update modal to be scrollable inside modal content;

===

🔵 Improve UI/UX of exported reports

===

🔵 Cleanup all env variables and example for both ui and supabase
