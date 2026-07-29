# Claude Code tooling — Guest Form Management

Agent context for **Claude Code** in this repo. Mirrors `.cursor/rules/README.md` (the Cursor-side index) — read that too; `.mdc` rule files aren't auto-loaded by Claude Code, so `CLAUDE.md` points here and at `.cursor/rules/*.mdc` directly.

## Always loaded

| File        | Purpose                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| `CLAUDE.md` | Stack, commands, architecture, booking workflow, doc-sync rules — repo root |

**Plan mode:** `.cursor/rules/plan-mode.mdc` — finished plans go to `docs/planning/planned_modules/` (also summarized in `CLAUDE.md` § Plan mode).

## Skills (`.claude/skills/*/SKILL.md` — invoke `/name` or Claude decides)

Mirrored from `.cursor/skills/` (see `.claude/skills/README.md` for the sync command) plus one Claude Code–only addition:

| Skill               | Use for                                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify`            | **Claude Code only.** Recorded recipe for the bundled `/verify` skill — type-check/lint/build, curl edge functions locally, drive the UI with Playwright MCP. No Cursor equivalent.          |
| `mobile-responsive` | Breakpoints, touch targets, admin shell, tables — mirrors an **always-on** Cursor rule (`mobile-responsive.mdc`) that has no automatic Claude Code equivalent, so invoke it for any UI task. |

All other skills (booking-workflow, admin-dashboard, forms, multi-tenancy, gmail-listener, supabase-stack, tanstack-query, accessibility, github-issues, …) are 1:1 mirrors of `.cursor/skills/*` — see that directory's `SKILL.md` files for what each covers.

**No dedicated skill yet** for: Finance module, Maintenance module, Marketing Studio (AI captions/video/Meta publish), Guest Inbox AI-suggested replies, the guest portal (authenticated guest profile/trips, separate from the anonymous booking form), pricing calendars, super-admin platform ops (`/admin/*` — developments, hosts, cross-org property listing), org verification (base/enhanced tiers). These are real, shipped parts of the app, not hypothetical — read `docs/PROJECT.md` directly for them until a skill exists.

**If `property-management-app` shows up as an additional working directory in this session**, you may see Next.js/tRPC/Drizzle/AWS-S3-flavored skills in the picker (`drizzle-orm`, `trpc-api`, `aws-s3`, `form-builder`, `property-management`, `testing`, `ui-design`, …). Those belong to that _other_ repo and are correct there — never use them while working in `guest-form-management`, regardless of what the picker offers. See `CLAUDE.md` → Don'ts.

## Subagents (`.claude/agents/*.md`)

Ported from `.cursor/agents/`. Claude Code subagents use `tools:` (allowlist) instead of Cursor's `readonly:` flag, and `model: haiku` instead of Cursor's `model: fast`.

| Agent              | model   | tools                              | Use for                                                           |
| ------------------ | ------- | ---------------------------------- | ----------------------------------------------------------------- |
| `debugger`         | inherit | all                                | Root-cause errors and test failures                               |
| `security-auditor` | inherit | Read, Grep, Glob, Bash (no writes) | Readonly audit of auth/PII/edge-function surfaces before shipping |
| `test-runner`      | haiku   | Bash, Read, Grep, Glob             | Run type-check/lint/build after a change                          |
| `verifier`         | haiku   | Bash, Read, Grep, Glob             | Skeptically confirm claimed-done work actually works              |

## Commands (`.claude/commands/*.md`)

Same as Cursor's `.cursor/commands/`; Claude Code commands and skills both create `/name` — these stay as plain commands since they're short, fixed prompts, not multi-file skill packages.

| Command                | Purpose                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `/fix-merge-conflicts` | Resolve merge conflicts without breaking either side's changes                                     |
| `/github-issue`        | View / create / update / ship issues on `sprmke/kame-homes` (backed by `scripts/dev/gh-issue.mjs`) |

## Hooks (`.claude/settings.json` → `"hooks"`, scripts in `.claude/hooks/`)

Ported from `.cursor/hooks.json` + `.cursor/hooks/*.sh`, translated to Claude Code's stdin JSON shape (`tool_input.file_path` / `tool_input.command`) and output contract (`hookSpecificOutput.permissionDecision`). See `.claude/skills/README.md` for the exact translation notes if re-syncing after a Cursor-side hook change.

| Hook                          | Event / matcher          | Purpose                                                                                  |
| ----------------------------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| `format-edited-file.sh`       | PostToolUse, Edit\|Write | Prettier-format the file that was just touched                                           |
| `check-stack-terminology.sh`  | PostToolUse, Edit\|Write | Warns (non-blocking) on Next.js/tRPC/Drizzle terms — wrong stack for this repo           |
| `guard-shell.sh`              | PreToolUse, Bash         | Deny `rm -rf /`/`~`; ask before `DROP TABLE`, `stop:supabase:clean`, force-push          |
| `guard-shipped-migrations.sh` | PreToolUse, Edit         | Deny editing an existing file under `supabase/migrations/` — add a new migration instead |

## MCP servers (`.mcp.json`, shared with Cursor via `.cursor/mcp.json` symlink)

| Server       | Needs                                                 | Use for                                                                          |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `supabase`   | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` (env) | Schema/logs/advisors against local or hosted Supabase — **read-only by default** |
| `playwright` | nothing                                               | Drive the real guest form / admin dashboard in a browser (used by `/verify`)     |
| `context7`   | nothing (optional key for higher rate limits)         | Current docs for React Router, TanStack Query, Zod, Radix, date-fns, …           |
| `github`     | `GITHUB_TOKEN` (env — `gh auth token` works)          | Repo/PR/Actions visibility from chat                                             |

Export the env vars in your shell profile — never commit them. `SUPABASE_ACCESS_TOKEN`: Supabase dashboard → Account → Access Tokens. `SUPABASE_PROJECT_REF`: the `<ref>` in your project's Supabase URL. `GITHUB_TOKEN`: `gh auth token` (requires `gh auth login` once) or a PAT with repo scope.

To allow Supabase MCP to write (default is `--read-only`), edit the `args` in `.mcp.json` locally — don't commit that change unless the whole team should have write access from chat.

## Updating

When you change something on the Cursor side (`.cursor/rules/`, `.cursor/skills/`, `.cursor/agents/`, `.cursor/commands/`, `.cursor/hooks/`), mirror it here in the same change — see `.claude/skills/README.md` for the exact translation notes per category. `.mcp.json` needs no mirroring; `.cursor/mcp.json` is a symlink to it.
