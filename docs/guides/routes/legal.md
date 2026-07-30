# Legal pages — operator guide

Routes: `/terms` · `/privacy`

> **Status:** Documented — **Phase 1 (UI only)**. Static legal copy from PMA port.

## Progress overview

| Section        | E2E save | Validation | Docs       | Notes                |
| -------------- | -------- | ---------- | ---------- | -------------------- |
| Terms of use   | —        | —          | Documented | Static HTML sections |
| Privacy policy | —        | —          | Documented | Static HTML sections |

---

## Overview

Footer links from **`MarketingFooter`**. No forms or API calls. Content is hard-coded in page components (match PMA structure and typography).

---

## Host-facing knowledge

These are the public Terms of Use and Privacy Policy linked from the site footer. Guests and hosts see the same pages; there is nothing to configure in the dashboard.

**Common host questions**

- Q: Can I edit the terms or privacy text from my dashboard?
  A: Not today — the copy is fixed in the app and will need a product update before launch review.
- Q: Do guests have to accept these before booking?
  A: Not on a separate checkbox step; the pages are available for reference from the footer.
- Q: Are my verification documents covered by the privacy policy?
  A: The policy describes how the platform handles data generally; verification uploads are stored privately and never shown on public listings.

---

## Implementation map

| Concern | Path                                                    |
| ------- | ------------------------------------------------------- |
| Terms   | `ui/src/features/guest/marketing/pages/TermsPage.tsx`   |
| Privacy | `ui/src/features/guest/marketing/pages/PrivacyPage.tsx` |
| Layout  | `MarketingLayoutShell`                                  |
| Routes  | `ui/src/features/guest/marketing/routes/index.tsx`      |

---

## Related docs

- [Route index](./README.md)

---

## Pending / follow-ups

- [ ] Legal review before production marketing launch
- [ ] Optional CMS or markdown source for policy updates
