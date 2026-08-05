# Scripts

Repo automation — local dev, data sync, deploy, integrations. Run from **repo root** unless noted.

## Layout

```
scripts/
  marketing/     Host marketing asset generators (Edge TTS narration)
  dev/           Local Supabase + edge functions env
  data/          Prod → local Postgres sync
  deploy/        Linked Supabase project deploy
  preview/       Email template preview from DB
  docs/          One-off docs/ vault migrations
```

## Marketing (`scripts/marketing/`)

| Script                            | Purpose                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `generate-host-tour-narration.ts` | Edge TTS → `ui/public/marketing/for-hosts/narration/{chapterId}.mp3` for the `/for-hosts` Remotion tour |

Requires `pip3 install --user edge-tts`. Flags: `--voice` (default `en-US-AriaNeural`), `--rate` (default `+8%`).

## Dev (`scripts/dev/`)

| Script                                 | Used by                                       | Purpose                                                                                                             |
| -------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `run-with-ui-dev-env.sh`               | `dev.sh`, `bun run start:supabase`            | Load `ui/.env.development` then exec command                                                                        |
| `build-local-functions-env.sh`         | `dev.sh`, `bun run dev:api`                   | Merge `.env.local` + local API keys for `functions serve`                                                           |
| `export-local-supabase-runtime-env.sh` | `build-local-functions-env.sh`                | Export `SUPABASE_URL` / service role from `supabase status`                                                         |
| `check-ui-filename-conventions.sh`     | `bun run check:filenames`                     | Verify `ui/src` filenames match naming rules                                                                        |
| `check-ai-tooling-sync.sh`             | `bun run check:ai-tooling-sync`               | Cursor/Claude skills, commands, agents, hooks, MCP parity                                                           |
| `setup-ai-tooling.sh`                  | `bun run setup:ai-tooling`                    | One-shot team AI tooling setup (symlinks, ecosystem skills, DESIGN.md, Playwright CLI, verify)                      |
| `setup-agents-skills.sh`               | `bun run setup:agents-skills`                 | Restore `.agents/skills/*` from `skills-lock.json` + Cursor/Claude symlinks                                         |
| `setup-impeccable.sh`                  | `bun run setup:impeccable`                    | Alias → `setup-agents-skills` (backcompat)                                                                          |
| `setup-playwright-cli.sh`              | `bun run setup:playwright-cli`                | Ensure `@playwright/cli` binary + skill                                                                             |
| `setup-design-md.sh`                   | `bun run setup:design-md`                     | Vendor awesome-design-md refs + wire `design-md` skill                                                              |
| `port-pma-public-ui.sh`                | (manual)                                      | Rsync PMA `features/marketing` → `ui/src/features/guest/marketing` (excludes GFM pages/routes)                      |
| `migrate-shared-imports.sh`            | (one-shot reference)                          | Bulk `@/lib/*` + `@/utils/*` path rewrites                                                                          |
| `gh-issue.mjs`                         | (manual)                                      | View / create / update / **ship** GitHub issues → `docs/archive/todos/shipped/` (see `/github-issue`)               |
| `backlog-issue-sizing.mjs`             | `gh-issue.mjs create`                         | Auto-label heuristics for new issues                                                                                |
| `check-video-motion-profiles.mjs`      | (manual, `bun`; source `ui/.env.development`) | Quiet Coast Motion: finite Remotion springs, recipe layout coverage, and storyboard→layer seed for all 16 templates |
| `seed-search-fixtures.sql`             | (manual / `supabase/seed.sql`)                | Azure ACTIVE listings so typeahead **See all** has ≥3 hits per category (`azure`)                                   |

## Data (`scripts/data/`)

| Script                              | npm script               | Purpose                                   |
| ----------------------------------- | ------------------------ | ----------------------------------------- |
| `sync-prod-public-data-to-local.sh` | `bun run sync:prod-data` | Dump prod `public` schema → local DB      |
| `sql/after-prod-data-restore.sql`   | (called by sync script)  | Legacy status normalization after restore |

## Deploy (`scripts/deploy/`)

| Script               | npm script                | Purpose                                          |
| -------------------- | ------------------------- | ------------------------------------------------ |
| `deploy-supabase.sh` | `bun run deploy:supabase` | `db push` + `functions deploy` to linked project |

## Preview (`scripts/preview/`)

| Script                       | npm script                  | Purpose                                  |
| ---------------------------- | --------------------------- | ---------------------------------------- |
| `preview-emails-from-db.mjs` | `bun run preview:emails:db` | Render email HTML previews from local DB |

## Docs (`scripts/docs/`)

| Script                    | npm script                   | Purpose                                                                                                                                                |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `convert-to-obsidian.mjs` | (manual, one-shot; ran once) | Adds Obsidian frontmatter to every `docs/**/*.md` and rewrites safe `docs/...md` code-span refs into `[[wikilinks]]`. `--dry-run` / `--verbose` flags. |

See also **`dev.sh`** (full stack) and **`docs/archive/operations/`** runbooks.

## VS Code (`.vscode/`)

| File              | Purpose                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `tasks.json`      | Dev, quality, Supabase, deploy, preview tasks (`bun run …`)             |
| `launch.json`     | Chrome debug for Vite UI; compounds with dev tasks                      |
| `settings.json`   | Prettier, ESLint (`ui/`), Tailwind (`ui/`), Deno (`supabase/functions`) |
| `extensions.json` | Recommended extensions (Bun, ESLint, Prettier, Tailwind, Deno)          |

Run tasks: **Terminal → Run Task** (default build: **Dev: Full stack**).
