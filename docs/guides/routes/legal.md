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
