---
title: 'QA — Property Templates'
status: active
updated: 2026-08-29
---

# 11 — Templates

Route: `/org/:orgSlug/property/:propertySlug/templates`

## Looks good

- Standard stay-guide templates free; email save Starter+; custom create Starter+.
- Preview uses same send renderer — trustable.
- TipTap duplicate extension warnings in console (noise).

## Issues

| Sev | Issue                                                                                 | Evidence            |
| --- | ------------------------------------------------------------------------------------- | ------------------- |
| P2  | Custom templates stored but **not wired to any send** — hosts may create dead content | Guide “Not wired”   |
| P3  | TipTap duplicate `link`/`underline` warnings                                          | Console during walk |

## Improvements

- Either wire custom templates to a manual “Send to guest” or hide Create until wired.
- Dedupe TipTap extensions.

## Doc gaps

- Guide honestly documents unwired custom templates — keep that callout.

## Evidence

Live Templates load; guide `templates.md`; console tiptap warns.
