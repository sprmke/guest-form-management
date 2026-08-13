---
title: 'Claude To Plan'
status: archived
tags: [planning]
updated: 2026-08-13
---

**Status legend:** ✅ done · 🚧 in progress · 📋 planned (plan doc written) · 🔵 pending / open · ❌ cancelled / won't do

===

✅ Improve for-hosts landing page

For host mode, we should improve the landing page for /for-hosts that showcase all the features and functionalities that we have from our dashboard. I want to have a stunning, looks very professional, animated landing page that showcase all the features that we have for our system.

Reviews section from hosts is also good. We can use mock data for now.

We should also need to update our header menus for hosts mode

===

🔵 Improve onboarding flow UI/UX page

I want to update the left section of the onboarding page and showcase all the features that we have for our system.
Maybe an auto-play carousel of animated features that we have on our dashboard.
I want this to look very interactive, animated, looks professional and looks good on any resolution.

===

✅ Refine Property Templates page

We should have a tab for standard, email and other templates.
Then, we should support for host to add new template for each tab/category.

===

📋 OPTION A: Improve stay guide UI/UX page

The stay guide page looks very plain and not appealing at all. This needs to be mobile friendly, looks professional, interactive and has wow factor so that when hosts send this link to their guests, they will be happy using it.

→ **Plan:** [`../planned/custom-pages-module.md`](../planned/custom-pages-module.md) (Option B; Option A is stay-guide slice of same plan)

===

📋 OPTION B: Templated configurable & shareable custom pages

Generate 3-5 templated stunning and professional looking landing pages/stay guide pages that contains these standard templates, property information and booking information for hosts to send their to their guests.

<Provide sample designs here>

On the dashboard, we will have new menu and page for "Custom Pages" where they can selected templated pages that's configurable and shareable.
Maybe we will offer a simplified website editor?

→ **Plan:** [`../planned/custom-pages-module.md`](../planned/custom-pages-module.md)

===

✅ Make our main public search bar fully working

Let's analyze all public data that we have for developments, properties, parkings, etc and based from our data, we need to have a solid implementation on how our main search bar is going to work, this should be smart, cached, and fully working similar on how popular apps offer search bar that can find, filter, search and suggest information based on our search inputs that we have (where, when, |who).

Let's implement a smart search bar that can understand what the user wants to search and based from it, provide info or suggest common or similar search input text.

Our search should suggest information for where. And when they click search button, we should have smart and suggest results.

See how popular apps do this and make sure we have similar UI/UX and search results/suggestion.

Make sure that filtered result are animated and we display it elegantly. Not sure if we need to redirect it new /search result page or we can just display and update our content section based on result.

→ **Done:** [`../done/smart-search-bar.md`](../done/smart-search-bar.md)

===

✅ Make filters fully working

Once we finalized and have fully working search bar and functionality, we should also update and make our filter works fully end to end.

Based on which route or module we are, we should provide smart filter options and make sure all options are smartly suggested and all of it should properly filter our results/items.

The goal is to have a very smart filter sidebar section to filter any data that we have on different modules & pages.

We should also refine and update our sort options based on our data and make sure this will also work properly.

→ **Done:** [`../done/smart-filters.md`](../done/smart-filters.md)

===

✅ Marketing 1: Improve Marketing Calendar Templates

Right now, our marketing calendar templates look simple and okay.
They do not look beautiful, stunning, eye catching, and doesn't have that wow factor.
Please improve all these templates and provide better categories. Each template should have different characteristics, showcase all settings available for calendar customization, different fonts, element shapes/border/spacing/colors, etc.
The end goal is the every template looks so good where host cannot select which one to choose because they all look good!

===

✅ Marketing 2: Improve Marketing Design Templates & Customizablity

Same with calendar templates above. Right now, our canvas template are too plain and does not look good.The
goal is that each template should be production ready and "instagramable" and ready to publish with confidence and excitement to their social platforms.

===

✅ Marketing 3: Improve Marketing Video Templates & Customizablity

Same with marketing design templates goal.

→ **Follow-up (Quiet Coast Motion):** from-scratch Video redo — Video-only categories + storyboard recipes. Spec: `docs/archive/superpowers/specs/marketing-video-quiet-coast-motion-design.md`. Plan: `docs/workflow/done/marketing-video-quiet-coast-motion.md`.

===

🚧 Marketing 4: Use AI to generate marketing calendar, design and video templates

Now that we made some improvements on marketing calendar, canvas and video editors, I want to really extend by having AI feature that will generate design and video templates from scratch that looks very beautiful, elegant, instagrammable and has wow factor to hosts.

The generated result can be configured by some prompts, suggestions, etc (please make some research how popular media editors do AI generated flow).

We can also make some research if there's a free or low cost API that can do this. Either the AI generates the calendar, canvas and video from scratch or custom or it's own way, OR it will reads and build new designs based on our existing technologies, templates and settings that we have for each marketing module.

The end goal is that with the help of AI, we should be able to generate calendar, canvas and video templates for our hosts that's still using our booking or property information and some prompts/settings.

→ **In progress:** [`../in-progress/marketing-ai-generated-templates.md`](../in-progress/marketing-ai-generated-templates.md) (calendar MVP shipped; design/video next)

===

🔵 Marketing 5: Refine & finalize Marketing module

- Make sure each module is optimized. Right now, something is not right and kinda laggy when we visit it
- Make sure publish to social platform is supported
- Revisit and review each template, refine it more to be more social and case updated

===

✅ Refine footer & create public pages

Plan only — not implemented. Footer links point at `/about`, `/contact`, `/support`, `/cookies` but routes/pages do not exist yet.

→ **Plan:** [`../planned/refine-footer-public-pages.md`](../planned/refine-footer-public-pages.md)

===

✅ Refine our route guides to have complete context for each page & section in our app

Let's refine and update our /docs/guides directory and make sure we have documentation for all features, flow, logic and complete understanding on what's available and happening for each pages and section in our app.

Make sure we always update and add any new routes or updated any missed routes. Revisit each guide doc routes and make sure we update with our latest changes available.

This document will be helpful in our project while we develop it and my goal is to provide this docs when we integrate AI chat in our dashboard to provide better response and context to hosts when they ask something about some app knowledge, features, flow, process, etc

The goal of this docs is to become a context and product knowledge for our AI receptionist & dashboard AI assistant features

===

✅ Extend chat app to have real-time chat with AI receptionist

I want to extend our normal real-time chat app to provide an option for guests to try out our AI receptionist to talk and answer their inquiries.
When they enable it or try it, we will have different interface where we display an animated and cute turtle that speaks and have conversation with out guest. I'm thinking where we have a button to talk to our receptionist, and when they click it, it will start a session or recording and guest can talk to it, display real-time detect words/conversation and display the response of our receptionist in real time.

Basically like Siri or alexa with animated talking cute turtle. Same with our normal AI auto-reply, it should have access to property, booking information but limits to sensitive data that a normal guests should not know.

Please plan and make a research if there's already existing libraries, technologies that we can use that's FREE (or very low cost), app performant, and can production ready.

Also, please consider the session time, AI token usages, and other important things to plan and consider with this feature.

All the settings should be configurable in our admin dashboard as well. If we can choose between voices, and other settings, etc, that would be great!

I think there are a lot of existing projects like this, what we need to plan and refine is this should be production grade level, will not introduce any issues or security risks, it should not crash, and it should be easy to use and helpful for guests.

→ **Done:** [`../done/ai-voice-receptionist.md`](../done/ai-voice-receptionist.md)

===

📋 Provide chat app that can access and manage entire dashboard

Another big module that I'd like to support is to have a chat app that can access and manage entire dashboard. This should be a chat app that can understand natural language, and can do actions like booking, check-in, check-out, etc. It should be able to understand the context of the conversation and respond accordingly.

What we want is to simplify all property management with the help of AI. It should have access to our APIs, get information, execute actions based on context.

The chat response or suggestion should have a good looking UI/UX within the chat, we should display different kind of UI elements like cards, lists, buttons, etc. to make it more interactive and helpful.

This should be very smart and it will act like an assistant that have all information on how our system and every feature work, the flow and process, it should be very helpful and can suggest helpful actions and information to our host so that they can manage their property more efficiently and easily without the needs to do everything manually and this will also reduce complexity of understanding the whole app, process, logic and flow.

This is a very important feature that will make our system much more powerful and helpful and reasons for user to subscribe and use our system.

Again, this should not provide any sensitive or execute any harmful actions that may affect the system. We should implement a strong guard rails or security measures for this feature.

Also, we need to make sure that this is connected to our AI receptionist, or may share same util, process, flow since both of these modules are using AI.
We need to plan the architecture, flow, process for both module to build a production ready chat app.

Also, this should be tied app with our pricing and subscription module so that we can limit the free usages of this feature to a certain amount and charge for additional usage.

→ **Plan:** [`../planned/ai-dashboard-assistant.md`](../planned/ai-dashboard-assistant.md)

===

🔵 Booking from listing e2e

I want you to review our whole booking end to end flow and make sure it's production ready. When a guest book from our listing page or from our guest form. Please review each step, flow and process that we have. Improve UI/UX or flow that we need to improve.

The end goal is to make sure that we don't miss any important step or process for e2e booking process. Make sure we provide the best UX as much as possible to our guest.

Do /impeccable critique, audit, review, harden & polish of our current e2e booking process and list down things that we can improve and create superpowers executable plan for it.

🚧 Refine booking detail page, edit and workflow

- Improve UI/UX of entire booking detail page and edit form
- Improve UI/UX and refine each elements, sections, modal, actions, process, status, logic and flow for booking e2e flow and make sure it's production ready
  - Update implementation for automated gmail listener to use resend reply/hooks to prevent the need of Google CASA approval
  - Entirely remove or limit access for google calendar and sheets sync
  - Check and refine all automation triggers for each step/status
  - Update AI validation logic, display, etc
  - Refine and improve UI/UX for each step/status

===

📋 Avail parking e2e flow

Phase 1: Plan how host received parking booking
The first phase than we need to finalize for parking e2e is how host should receive and handle parking bookings. Should we follow how property bookings? Create new workflow and different status for parking? Also, how we should notify parking host that they received parking and need immediate review? Same telegram flow?

    Phase 0: Update parking registration, settings, etc
      - Update parking registration to ask for type (car, motor)
      - Update parking dimension to list of car type we can accommodate? In relation to height clearance
    Phase 1a: How do we notify both side (host & guest) about the parking request
      - Host side:
        - For immediate booking, use broadcast notif? First to accept will get the booking, if not process after 5 or 10mins, send new broadcast request.
        - How host will accept, reject, manage, send parking endorsement, etc
      - Guest side:
        - We should have realtime update if someone avail our parking, parking status, how guest can get and view parking endorsement
    Phase 1b: Create or reuse property detail page for parking detail page & edit form
      - Parking host should be able or required to modify their parking size/dimension so that we know if a certain car is fit or not when we connect or provide parking to guests
    Phase 1c: Create new workflow, actions & status for parking e2e flow
    Phase 1d: Update bookings page to support updated flow, changes (list, kanban?)
    Phase 1e: Review, refine, finalize and make sure it's production ready, multi-tenant/property/user, etc

Phase 2a: Get immediate parking

- When a guest avail a same day or on the spot look for available parking slot
- What's the logic or process to get the best parking available
  - Check-in & check-out
  - Respect tower unless bay
  - Is car going to fit on parking dimension
- Parking expiration: when host did not accept or process parking after a certain period, we will pass and look for other parking host
  - 15mins expiration for booking. 1hr expiration for non-same day/upcoming bookings
- Flow when we don't find available parking, do refund & notify guests?

Phase 2b: Look for parking after a confirmed booking from other host/property (upcoming/advance parking booking)

- When a guest book a property and require parking, and host does not have any parking, we should plan a way to automatically search and look for available parking on the same booking date/s and we should notify parking host to accept and manage it.
- Mostly same flow and logic with immediate parking flow

Phase 3: Finalize how we display parking from our listing

How are we going to display or provide UI/UX when guests/user wants to find a parking.
Same UI that we have now? But what if that parking host is not responsive anymore? Or not replying immediately?

- Should provide few ways to get parking?
  - A: Same UI listing we have for properties
  - B: Find/search available parking based on filters

Phase 4: Manual & Physical on site tasks:

- Picture different type of parking (tower, bay). Edit and add parking slot number dynamically
- Measure dimension and height clearance

→ **Plan (Phase 0 & Phase 1):** [`../planned/parking-e2e-phase1-overview.md`](../planned/parking-e2e-phase1-overview.md) (+ companions: registration-dimensions, status-workflow, host-broadcast-notifications, guest-request-realtime-status, bookings-page-updates). Phase 2a/2b/3/4 stubs: [`../planned/parking-e2e-later-phases.md`](../planned/parking-e2e-later-phases.md).

===

🔵 Host/Guest booking payment e2e

===

🔵 Invoice generator? Or provide invoice every after successful booking

===

🔵 Guest chat to confirmed booking flow e2e

===

🔵 Free trial, subscription and payments to use app

===

🔵 Review, refine and improve e2e of booking flow/page

===

🔵 Redesign our main landing page

===

🔵 Implement Sentry & Posthog

===

🚧 Do an ground up redesign for mobile view

I want to have a rebuilt or groundup redesign for mobile view to make our app look and feels like a native mobile app.
Not just simply a website or page that's adjusted to be responsive to different resolution.
We need to consider the best UI/UX for each page, section and components that we have in our app
The end goal is when we resize to mobile view, it should look and feel like a native mobile app where we have main navigation on the bottom, mobile element animation and transitions, etc

Apply to all pages including both public and dashboard pages

→ **In progress:** [`../in-progress/mobile-native-redesign.md`](../in-progress/mobile-native-redesign.md)

===

📋 Do ground up redesign in dashboard UI to not make it look like AI generated app

Even after multiple redesign changes, it looks and feel like our dashboard UI looks like AI generated dashboard app.
We need to do /impeccable critique, audit then do plan, shape, document then do layout, optimize, bolder & polish.
The end goal is to make our boring or current dashboard UI to level up and looks more beautiful, elegant, clean & professional, animated & interactive that offers best UI/UX and specially, does not look like AI generated design and application.
You can refer to our public pages design. See how elegant and clean it is.

We can separate our dashboard redesign to different phases. Maybe start with base styles, fonts & sizing, colors & theme and designs, etc. Then, next phases are structural change, text copy change, alignment, responsiveness, etc.

Just make sure that we don't change or affect any public related pages that we have. make sure not even one single style on our public pages will be affected. We need to make sure that the design in our dashboard is scoped & isolated and will not affect our public UIs.

→ **Plan:** [`../planned/dashboard-ground-up-redesign.md`](../planned/dashboard-ground-up-redesign.md)

===

🔵 Review implementation on the following modules

Review the implementation on the following modules and make sure we simplify, recode, improve and make sure it's production ready and does not contain trash code or changes, poor implemented features caused by AI vibe coding. Be a 10x senior software engineering and review the following modules and make sure it met our standards and they are all production ready and will not cause any performance issue or security and lastly, make sure everything is still working properly

- Marketing
- Inbox (Meta chats)
- Real-time web chat app (host & guest side)

===

🔵 Offer ads within the app

===

🔵 Display announcements per development from super admin

===

🔵 Monitoring for suspicious or unusual activities from super admin

===

🔵 Guest Review after booking

===

🔵 Prod readiness checklist

- Frontend
- Backend & APIs
- Database
- Storage
- Auth / Permissions
- Hosting & Deployment
- Cloud Computing
- CI/CD & Version control
- Security & RLS
- Rate Limiting
- Caching & CDN
- Load Balancing & Scalability
- Error Tracking & Logs
- Analytics
- SDLC Testing
- Availability & Recovery

===

✅ Optimize how AI integrated in our app

Make a research and find the best optimal way to connect our application with AI for faster info retrieval, action execution, etc.

Maybe we can use our docs guide or obsedian vault or RAG/light RAG or something like graphify? Or if there's better library or technology that we can use.

Also, I'm wondering if having docs/guides for each page of the app is the best optimal way to document and use this for AI to have context of our entire application?

The goal is to find and implement the best way to document each flow, logic, process of each feature, pages, sections that's happening on our entire application that's fastest, optimal, and best lowest token consumption. It should be production ready

Let's update our implementation that's using or relying with AI like the AI-auto reply, AI receptionist, and other future related features that will use AI.

→ **Done:** [`../done/docs-obsidian-tooling-sync.md`](../done/docs-obsidian-tooling-sync.md)

===

📋 Analyze entire app pages & features and brainstorm how AI can help us for each feature

Analyze the entire codebase, pages and features that we have, and see how AI can help hosts, guests, admin, and us developers on anything

Example:

- Use AI to analyze and suggest marketing strategies
- Use AI to help managing finance, analyze big expenses, how to fix and suggest financial strats, etc

→ **Plan / backlog:** [`../planned/ai-opportunities-roadmap.md`](../planned/ai-opportunities-roadmap.md)

===

🚧 Document, refine, finalize booking detail & workflow

I want you to carefully review our booking detail page, booking edit and booking workflow and see how we can improve, refine, make other flow, logic and settings to be configurable from our property settings and make the whole flow to be multi users and multi property. What we have in prod, we are focused and only support Kame Home 2604. Now we are building our system to be used with different tenant, users, multi-properties, multi residence or property type and I want every little things to be configurable and refined for production used.

I believe we already have docs for this, I just want you to review our latest implementation and make sure it's up to date, then create a one file doc that documents everything.

After that, I want you to list down tasks, suggestion and improvements that we need to do to make our booking workflow to be used by different users and properties.

The current booking status that we have is only applied for Azure North residence, again we should have config for this residence.

Also, I want you to review each section, field, settings, flow, logic & process and if there's something we can improve or change, please suggest it.

Also, for parking request step, skip this for now. The whole flow for this will be TBD later on.

Also, another important thing I'd like to improve is to automate everything as much as possible. Right now, there's still some step or transition that require manual admin transition. Analyze and check how we can automate everything.

The end goal is after this, our booking detail, edit and workflow is refined & finalize and production ready.

→ **In progress:** [`../in-progress/booking-workflow-multi-tenancy.md`](../in-progress/booking-workflow-multi-tenancy.md) · v1 slice **done:** [`../done/booking-workflow-configurable-docs.md`](../done/booking-workflow-configurable-docs.md)

===

🔵 Review each dashboard pages, section & actions based on user role

After we refine the roles & permissions that we have on both org and property level, we need to revisit and review each pages within the dashboard and make sure that each section, elements, action, process, flow, basically everything is well thought and only be accessible based on user role

===

📋 In app notification for chat & other activity

When we receive new chat or guest message from inbox, we should display a toast or notification message on our app as long as we are using the app and even we are not on inbox page.

For now, I think this would be helpful for chat events, but if you can see other features and functionality that you think we can add to our notification. Feel free to suggest and plan it as well

Maybe analyze all the activities, events and actions that we have on Notifications page module as support in app notification on all activities, events or actions that you think it's helpful to display within our app.

Analyze how popular apps how handle this and make sure we implement the way possible and make sure it will not result to any kind of performance or heavy process issues.

→ **Plan:** [`../planned/in-app-notifications.md`](../planned/in-app-notifications.md)

===

✅ Smart import data with use of AI

Shipped: [`../done/smart-ai-data-importer.md`](../done/smart-ai-data-importer.md) + [`../done/import-preview-fix-queue.md`](../done/import-preview-fix-queue.md)

===

🔵 Pool fee should be configurable via development settings and we need to adjust AI receptionist or AI tool that beside on reading property & booking info, we should also check which development it's under the current property and have access to development information just like the amenities, pool fee, schedule of pool, requirements, guides, etc

===

🔵 Create marketing video ads for our app with remotion that features our core & main features

===

🔵 Support google map directions from use current area to properties/places

===

🚧 CI/CD + multi-tenant environments — [`multi-tenant-dev-prod-environments.md`](../in-progress/ci-cd-environments/multi-tenant-dev-prod-environments.md) · matrix [`ci-cd-environment-matrix.md`](../../archive/operations/ci-cd-environment-matrix.md)

**Now:** `develop` → `dev.kamehomes.space` → **fwor…** (`cd-dev.yml` + Vercel Preview). Legacy unchanged (`main` → `kamehomes.space` → **zftt…**).

**Pending at prod release (Phase B):**

- Create **MULTI_TENANT_PROD** Supabase project
- Implement **`scripts/migrate/legacy-to-mt-prod/`** — Postgres + Storage **`zftt…` → mt-prod**
- Merge **`develop` → `main`**; **`kame-homes`** Production branch = **`main`** (not a `production` git branch)
- Wire **`app.kamehomes.space`** + Vercel Production `VITE_*` → mt-prod
- Google OAuth **prod** client + Auth on mt-prod
- Enable GitHub **`production`** secrets + **`cd-prod.yml`**

Design: [`ci-cd-dev-prod-design.md`](../in-progress/ci-cd-environments/ci-cd-dev-prod-design.md) · plan: [`ci-cd-dev-prod.md`](../in-progress/ci-cd-environments/ci-cd-dev-prod.md) · index [`ci-cd-environments/README.md`](../in-progress/ci-cd-environments/README.md)

===

🔵 Cancellation Process

===

🔵 Able to send documents through chat
