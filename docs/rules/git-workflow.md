# Git Workflow & Environments (dev-first) — Diagnos Data App

Every change (feature, fix, refactor, migration, docs) reaches production **only through `dev`**. Referenced by AGENTS.md section 13.

---

## 1. Branches and environments

| | **dev** (staging) | **prod** |
|---|---|---|
| Git branch | `dev` | `main` |
| URL | http://w3fh1crzxtmzioaxsvp16rpz.187.127.55.238.sslip.io | https://diagnosdata.rhemadata.com |
| Coolify app | `diagnosdata-app-dev` (`w3fh1crzxtmzioaxsvp16rpz`), environment `dev` | `diagnosdata-app` (`hfhyxim41i8zgcmbvppgri4q`), environment `production` |
| Supabase | `supabase-diagnosdata-dev` (`sjex5gn3mewrk9gw0sfadaak`) | `supabase-diagnosdata` (`jtrdrv8ijdq003npm6cwteda`) |
| Deploy | Automatic on every push/merge to `dev` (GitHub webhook → Coolify) | Manual, triggered by the owner |

- The two environments have **separate databases, queues and secrets**. Never point dev at the prod Supabase or the reverse.
- The dev app shares the LLM, Exa and Resend API keys with prod, so reports generated in dev cost real money and email the address in `MANAGER_NOTIFICATION_EMAIL`.

## 2. Flow for any change

```
dev ──► feat/<slug> or fix/<slug> ──► PR into dev ──► merge ──► auto deploy to dev URL ──► owner validates ──► PR dev → main (owner only)
```

1. Sync: `git fetch origin && git switch -c feat/<slug> origin/dev`.
2. Work, commit (Conventional Commits, see section 6), run `npm run lint && npm run typecheck && npm run test`.
3. Push the branch and open a PR **with base `dev`** (`gh pr create --base dev`).
4. After merge into `dev`, Coolify builds and deploys it. Check the deployment (`mcp__coolify__list_deployments`) and smoke-test the dev URL before reporting the work as done.
5. Promotion to prod is a separate PR `dev` → `main`, opened and merged **only when the owner asks**.

Fixes follow the same path, including urgent ones. A hotfix is a `fix/<slug>` branch from `dev`, merged into `dev`, validated, then promoted.

## 3. Hard rules for agents (Claude Code, OpenCode, Orca workers)

- Never commit, push, merge or force-push to `main`. Never open a PR whose base is `main` unless the owner explicitly asked for a promotion.
- Never branch from `main` for new work. Always branch from `origin/dev`.
- Never trigger a deploy, restart, rollback or env change on the prod Coolify app (`hfhyxim41i8zgcmbvppgri4q`) or prod Supabase service (`jtrdrv8ijdq003npm6cwteda`) without explicit instruction in the current conversation. Coolify MCP operations default to the dev app.
- Never run migrations or SQL against the prod database. Dev only.
- Never use `git push --force` / `-f` on shared branches (`dev`, `main`).
- Do not put secrets, tokens or passwords in tracked files (`.opencode/opencode.json`, `.mcp.json`, docs). Reference env vars instead.

## 4. Database migrations

- Migrations in `supabase/migrations/` must apply on an **empty database** from `0001` onward. When you change an existing function's return type, `DROP FUNCTION IF EXISTS` first (`CREATE OR REPLACE` cannot change it).
- Apply a new migration to the **dev** Supabase first and verify the app on the dev URL.
- Apply to prod only as part of the `dev` → `main` promotion, and only when the owner asks.
- Ways to apply to dev: Supabase Studio SQL editor of the dev service, or a temporary Coolify scheduled task on the `supabase-db` container of service `sjex5gn3mewrk9gw0sfadaak` (the `command` field is limited to 255 characters, so fetch the files from GitHub by commit SHA, run them with `psql -1`, then delete the task).

## 5. Environment variables

- A new variable must be added to `.env.example` and to **both** Coolify apps (dev and prod), with dev-specific values for anything that points at Supabase, `INTERNAL_API_KEY` or `NEXT_PUBLIC_APP_URL`.
- `NEXT_PUBLIC_*` values are build-time: after changing them, redeploy the app.
- Local development uses `.env.local`. It must point at the **dev** Supabase, not prod.

## 6. Commits and PRs

- Conventional Commits in Portuguese or English, matching the existing history (`feat(scope): ...`, `fix(scope): ...`).
- One logical change per PR. The PR description says what to check on the dev URL.

## 7. Tooling

- **Claude Code:** `CLAUDE.md` imports AGENTS.md; `.claude/settings.json` denies pushes to `main` and force-pushes.
- **OpenCode:** `.opencode/opencode.json` loads AGENTS.md and denies pushes to `main`; `/pr` opens a PR against `dev`.
- **Orca:** the repo's default base ref is `origin/dev` (`orca repo set-base-ref --repo name:diagnos-data-app --ref origin/dev`). New worktrees branch from `origin/dev`. Do not choose `main` as the base branch when creating a worktree.
