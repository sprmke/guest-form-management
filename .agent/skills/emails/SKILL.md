---
name: emails
description: Resend transactional email from Edge Functions — HTML templates, placeholders, workflow sends. Use when adding or changing booking emails, template editor, or emailService.
---

# Emails (GFM)

## Stack

- **Provider:** Resend (`RESEND_API_KEY` edge secret)
- **Templates:** HTML in `supabase/functions/_shared/email-templates/`
- **Render:** `_shared/renderEmailHtml.ts`, `_shared/emailService.ts`
- **Orchestration:** `_shared/workflowOrchestrator.ts` on status transitions

No React Email package — plain HTML + placeholder replacement.

## Adding a template

1. Create `supabase/functions/_shared/email-templates/my-template.html`
2. Add fragments if reusing header/footer from `fragments/`
3. Register sender in `emailService.ts`
4. Add **`static_files`** entries in `supabase/config.toml` for every function that loads the template (see `supabase-edge-functions.mdc`)
5. Preview locally: `bun run preview:emails`

## Workflow emails

Side-effect matrix: `.cursor/rules/booking-workflow.mdc` §3.

Examples: `booking-acknowledgement.html`, `ready-for-checkin.html`, `new-booking-request.html` (owner notify on guest submit only).

## Placeholders

Property template editor: `_shared/propertyTemplatePlaceholders.ts`, UI catalog in `templatePlaceholderCatalog.ts`.

## Don'ts

- CC guest on Azure-only request emails (GAF/pet to ops)
- Ship new HTML without `static_files` — production `ENOENT`
- Hardcode Monaco branding in new multi-tenant templates without property context

## Docs

- `docs/reference/booking-flow-guide-for-admin.md`
- `docs/operations/production-deployment.md` (Resend + static_files)
